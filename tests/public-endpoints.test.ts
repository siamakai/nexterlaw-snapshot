import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────
const rateLimit = vi.fn();
vi.mock('@/lib/security/rate-limit', async (orig) => {
  const real = await orig<typeof import('@/lib/security/rate-limit')>();
  return {
    ...real,
    checkRateLimit: (name: string, key: string) => rateLimit(name, key),
    checkRateLimits: async (checks: Array<[string, string]>) => {
      for (const [n, k] of checks) {
        const r = await rateLimit(n, k);
        if (!r.allowed) return r;
      }
      return { allowed: true, retryAfter: 0 };
    },
  };
});

const db = {
  lead: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  submission: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  globalSubmission: { create: vi.fn() },
};
vi.mock('@/lib/db/prisma', () => ({ prisma: db }));

const runPipeline = vi.fn();
vi.mock('@/lib/pipeline', () => ({ runGenerationPipeline: (id: string) => runPipeline(id) }));
const afterCallbacks: Array<() => Promise<void>> = [];
vi.mock('next/server', () => ({ after: (cb: () => Promise<void>) => afterCallbacks.push(cb) }));
vi.mock('@/lib/email', () => ({ sendGlobalSubmissionNotification: vi.fn() }));
// The PDF route renders with react-pdf; not needed for access tests.
vi.mock('@react-pdf/renderer', () => ({ renderToBuffer: vi.fn(async () => Buffer.from('%PDF')) }));
vi.mock('@/lib/pdf-template', () => ({ ReportPdf: () => null }));

import { isResultToken } from '@/lib/security/tokens';

const allow = { allowed: true, retryAfter: 0 };
const block = { allowed: false, retryAfter: 60 };
const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345'; // 32 chars, token-shaped
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  rateLimit.mockResolvedValue(allow);
});

const ukBody = {
  intake: {
    firmName: 'Test & Co', firmWebsite: '', city: 'Leeds', country: 'United Kingdom',
    practiceTypes: ['family'], firmSize: 'SMALL', euFacing: 'NO', workEmail: 'a@test-firm.co.uk',
  },
  selfAssessment: Object.fromEntries(
    ['compliance', 'literacy', 'explainability', 'accountability', 'rights', 'transparency',
     'reliability', 'usageGovernance', 'security', 'traceability'].map(k => [k, 'YES'])),
  consentGiven: true,
};
const post = (url: string, body: unknown, ip = '198.51.100.7') =>
  new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': ip } });

// ── /api/submit ─────────────────────────────────────────────────────────────
describe('POST /api/submit', () => {
  it('returns 429 and does no work when the IP limit is hit', async () => {
    rateLimit.mockResolvedValueOnce(block);
    const { POST } = await import('@/app/api/submit/route');
    const res = await POST(post('http://x/api/submit', ukBody));
    expect(res.status).toBe(429);
    expect(rateLimit).toHaveBeenCalledWith('submitIp', '198.51.100.7');
    expect(db.submission.create).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(0);
  });

  it('returns 429 when the email limit is hit', async () => {
    rateLimit.mockResolvedValueOnce(allow).mockResolvedValueOnce(block);
    const { POST } = await import('@/app/api/submit/route');
    const res = await POST(post('http://x/api/submit', ukBody));
    expect(res.status).toBe(429);
    expect(rateLimit).toHaveBeenLastCalledWith('submitEmail', 'a@test-firm.co.uk');
    expect(db.submission.create).not.toHaveBeenCalled();
  });

  it('creates the submission with a result token and returns it', async () => {
    db.lead.findFirst.mockResolvedValue(null);
    db.lead.create.mockResolvedValue({ id: 'lead1' });
    db.submission.create.mockImplementation(async ({ data }: { data: { resultToken: string } }) =>
      ({ id: 'sub1', resultToken: data.resultToken }));
    const { POST } = await import('@/app/api/submit/route');
    const res = await POST(post('http://x/api/submit', ukBody));
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.submissionId).toBe('sub1');
    expect(isResultToken(json.resultToken)).toBe(true);
    // On Vercel (no URL / secret) generation runs via after().
    expect(afterCallbacks).toHaveLength(1);
  });
});

// ── /api/submit-global ──────────────────────────────────────────────────────
describe('POST /api/submit-global', () => {
  it('returns 429 and stores nothing when the IP limit is hit', async () => {
    rateLimit.mockResolvedValueOnce(block);
    const { POST } = await import('@/app/api/submit-global/route');
    const res = await POST(post('http://x/api/submit-global', {}));
    expect(res.status).toBe(429);
    expect(rateLimit).toHaveBeenCalledWith('submitGlobalIp', '198.51.100.7');
    expect(db.globalSubmission.create).not.toHaveBeenCalled();
  });
});

// ── /api/report/[id] ────────────────────────────────────────────────────────
describe('GET /api/report/[ref]', () => {
  const get = (ref: string) => new Request(`http://x/api/report/${ref}`, { headers: { 'x-forwarded-for': '203.0.113.1' } });

  it('looks up by token for token-shaped refs (no legacy limit)', async () => {
    db.submission.findUnique.mockResolvedValue({ id: 'sub1', resultToken: TOKEN, status: 'GENERATING', report: null });
    const { GET } = await import('@/app/api/report/[id]/route');
    const res = await GET(get(TOKEN) as never, ctx(TOKEN));
    expect(res.status).toBe(200);
    expect(db.submission.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { resultToken: TOKEN } }));
    expect(rateLimit.mock.calls.map(c => c[0])).toEqual(['reportStatus']);
  });

  it('still serves legacy id links, with the tighter legacy limit', async () => {
    db.submission.findUnique.mockResolvedValue({ id: 'cmlegacyid', resultToken: null, status: 'PENDING', report: null });
    const { GET } = await import('@/app/api/report/[id]/route');
    await GET(get('cmlegacyid') as never, ctx('cmlegacyid'));
    expect(db.submission.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cmlegacyid' } }));
    expect(rateLimit.mock.calls.map(c => c[0])).toEqual(['reportStatus', 'reportLegacy']);
  });

  it('returns 429 without touching the database when limited', async () => {
    rateLimit.mockResolvedValueOnce(block);
    const { GET } = await import('@/app/api/report/[id]/route');
    const res = await GET(get(TOKEN) as never, ctx(TOKEN));
    expect(res.status).toBe(429);
    expect(db.submission.findUnique).not.toHaveBeenCalled();
  });

  it('never leaks internal failure text', async () => {
    db.submission.findUnique.mockResolvedValue({
      id: 'sub1', resultToken: TOKEN, status: 'FAILED', report: null,
      failureReason: 'Anthropic 529 overloaded at internal-host:1234',
    });
    const { GET } = await import('@/app/api/report/[id]/route');
    const json = await (await GET(get(TOKEN) as never, ctx(TOKEN))).json();
    expect(json).toEqual({ status: 'FAILED', error: 'Report generation failed.' });
  });

  it('points the PDF link at the token, not the id', async () => {
    db.submission.findUnique.mockResolvedValue({
      id: 'sub1', resultToken: TOKEN, status: 'COMPLETE', scoreBand: 'DEVELOPING', scoreHeadline: 55,
      report: { coverJson: {}, scoreNarrativeJson: '', regulatoryMapJson: {}, shadowAiJson: '',
        opportunitiesJson: [], exposuresJson: [], upsellJson: '' },
    });
    const { GET } = await import('@/app/api/report/[id]/route');
    const json = await (await GET(get(TOKEN) as never, ctx(TOKEN))).json();
    expect(json.pdfUrl).toBe(`/api/report/${TOKEN}/pdf`);
  });
});

describe('GET /api/report/[ref]/pdf', () => {
  it('is rate-limited and looks up by token', async () => {
    db.submission.findUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/report/[id]/pdf/route');
    const res = await GET(new Request('http://x') as never, ctx(TOKEN));
    expect(res.status).toBe(404);
    expect(rateLimit.mock.calls.map(c => c[0])).toEqual(['pdf']);
    expect(db.submission.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { resultToken: TOKEN } }));
  });
});
