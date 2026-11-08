import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/email', () => ({ sendDay0Email: vi.fn(), sendTeamAlert: vi.fn() }));
vi.mock('@/lib/google-sheets', () => ({ appendUsageRow: vi.fn() }));
vi.mock('@/lib/knowledge-retrieval', () => ({ retrieveKnowledgeBaseEntries: vi.fn() }));

import { buildCrmPayload, syncToCrm, type CrmContact } from '@/lib/crm/ghl';
import { generateWithReferenceCheck } from '@/lib/pipeline';
import { mockReport } from '@/lib/report-fixture';
import { computeScores } from '@/lib/scoring';
import type { GenerationResult } from '@/lib/report-generator';

const contact: CrmContact = {
  event: 'snapshot_completed', email: 'a@firm.co.uk', firmName: 'Firm', path: 'uk', band: 'EXPOSED', score: 32.5,
  sizeKey: 'SMALL', intakeRating: 'HIGH', euFacing: 'NOT_SURE', route: 'INTAKE_REVIEW', resultsUrl: 'https://x/r/t',
  marketingConsent: false, isTest: false,
};

afterEach(() => { delete process.env.GHL_MODE; delete process.env.GHL_WEBHOOK_URL; });

describe('GoHighLevel payload', () => {
  it('has the spec tags and custom fields', () => {
    const p = buildCrmPayload(contact);
    expect(p.tags).toEqual(expect.arrayContaining(['snapshot-v2', 'path-uk', 'band-exposed', 'size-small', 'intake-high', 'eu-not-sure', 'route-intake-review']));
    expect(p.customFields).toMatchObject({ snapshot_score: 33, snapshot_band: 'EXPOSED', snapshot_results_url: 'https://x/r/t' });
  });
  it('adds marketing tags only with marketing consent', () => {
    expect(buildCrmPayload(contact).tags).not.toContain('marketing-consent');
    expect(buildCrmPayload({ ...contact, marketingConsent: true }).tags).toEqual(expect.arrayContaining(['marketing-consent', 'nurture-snapshot']));
  });
  it('Global: snapshot-global + country tag + due/36h reminder', () => {
    const due = new Date('2026-11-10T12:00:00Z');
    const p = buildCrmPayload({ ...contact, event: 'global_submitted', path: 'global', country: 'United States', dueAt: due });
    expect(p.tags).toEqual(expect.arrayContaining(['snapshot-global', 'country-united-states', 'path-global']));
    expect(p.opportunity).toEqual({ pipeline: 'Global Snapshot', dueAt: due.toISOString(), reminderAt: '2026-11-10T00:00:00.000Z' });
  });
});

describe('syncToCrm modes', () => {
  it('never syncs test submissions', async () => {
    process.env.GHL_MODE = 'live';
    const f = vi.fn();
    expect(await syncToCrm({ ...contact, isTest: true }, f)).toEqual({ sent: false, reason: 'test' });
    expect(f).not.toHaveBeenCalled();
  });
  it('defaults to mock: no network call', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const f = vi.fn();
    expect(await syncToCrm(contact, f)).toEqual({ sent: false, reason: 'mock' });
    expect(f).not.toHaveBeenCalled();
  });
  it('live mode posts to the webhook', async () => {
    process.env.GHL_MODE = 'live';
    process.env.GHL_WEBHOOK_URL = 'https://hooks.example.test/x';
    const f = vi.fn(async () => new Response('{}', { status: 200 }));
    expect(await syncToCrm(contact, f as unknown as typeof fetch)).toEqual({ sent: true });
    expect(f).toHaveBeenCalledWith('https://hooks.example.test/x', expect.objectContaining({ method: 'POST' }));
  });
});

describe('reference check in generation (regenerate ≤2, then strip)', () => {
  const scores = computeScores({ compliance: 'NO', literacy: 'NO', explainability: 'NO', accountability: 'NO', rights: 'NO', transparency: 'NO', reliability: 'NO', usageGovernance: 'NO', security: 'NO', traceability: 'NO' });
  const result = (sra: string): GenerationResult => {
    const report = mockReport('Firm', scores, false, null);
    report.regulatoryMap.sra = sra;
    return { report, rawResponse: '', modelUsed: 'm', requestId: 'r', inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, estimatedCostUsd: 0 };
  };

  it('passes first time when there are no pinpoints', async () => {
    const gen = vi.fn(async () => result('The SRA expects supervision.'));
    const out = await generateWithReferenceCheck(gen, Date.now());
    expect(out.passed).toBe(true);
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it('regenerates with a correction and records what it found', async () => {
    const gen = vi.fn()
      .mockResolvedValueOnce(result('Under SRA Rule 6, keep confidences.'))
      .mockResolvedValueOnce(result('Under the SRA Code of Conduct, keep confidences.'));
    const out = await generateWithReferenceCheck(gen, Date.now());
    expect(gen).toHaveBeenCalledTimes(2);
    expect(gen.mock.calls[1][0]).toMatch(/SRA Rule 6/);
    expect(out.passed).toBe(false);
    expect(out.errors[0]).toMatch(/unapproved citation "SRA Rule 6"/);
    expect(out.result.report.regulatoryMap.sra).not.toMatch(/Rule 6/);
  });

  it('after 2 retries, strips the citations instead of trying again', async () => {
    const gen = vi.fn(async () => result('Under SRA Rule 6, keep confidences.'));
    const out = await generateWithReferenceCheck(gen, Date.now());
    expect(gen).toHaveBeenCalledTimes(3);
    expect(out.result.report.regulatoryMap.sra).not.toMatch(/Rule 6/);
    expect(out.errors.at(-1)).toMatch(/retries exhausted/);
  });

  it('strips without regenerating once the time budget is used', async () => {
    const gen = vi.fn(async () => result('See Principle 7.'));
    const out = await generateWithReferenceCheck(gen, 0, () => 200_000);
    expect(gen).toHaveBeenCalledTimes(1);
    expect(out.errors.at(-1)).toMatch(/time budget/);
  });
});
