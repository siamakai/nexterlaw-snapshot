import { describe, expect, it } from 'vitest';
import { checkReport, findCitations, stripUnapprovedCitations, unapproved } from '@/lib/reference-check';
import type { ApprovedReference } from '../content/approved-references';

// The exact wrong references flagged in the spec (§0.3, §4.1) must all be caught.
const SPEC_EXAMPLES = [
  'Under SRA Principle 7 and Code para 4.2, supervisors must oversee AI output.',
  'SRA Rule 6 requires confidentiality.',
  'See SRA Code of Conduct, Rule 6.3.',
  'SRA Standards and Regulations, para 3.2 (Competence) applies.',
  'Rule 8.6 (information about costs) may require disclosure.',
  'This engages Principle 4 (honesty).',
  'UK GDPR Article 35 requires a DPIA.',
  'EU AI Act Annex III lists high-risk uses; see Articles 51–55 (Title X).',
];

describe('finding citations', () => {
  it.each(SPEC_EXAMPLES)('catches: %s', text => {
    const found = unapproved(findCitations(text));
    expect(found.length).toBeGreaterThan(0);
  });

  it('allows instrument names without pinpoints', () => {
    const ok = 'Under the SRA Code of Conduct and UK GDPR, and the EU AI Act, firms should supervise AI. Section headings are fine.';
    expect(unapproved(findCitations(ok))).toEqual([]);
  });

  it('walks nested report objects and reports the path', () => {
    const findings = checkReport({ regulatoryMap: { sra: 'See SRA Rule 6.' }, exposures: [{ description: 'Article 22 UK GDPR applies.' }] });
    expect(findings.map(f => f.path).sort()).toEqual(['exposures[0].description', 'regulatoryMap.sra']);
  });

  it('passes a citation that is on the approved list (with its instrument nearby)', () => {
    const list: ApprovedReference[] = [{
      id: 'x', text: 'UK GDPR, Article 35', url: '', match: /UK GDPR[^.]{0,60}Article\s+35\b/i, reviewedBy: 'test', reviewedOn: '2026-11-08',
    }];
    expect(unapproved(findCitations('Under UK GDPR, Article 35 requires a DPIA.', '', list))).toEqual([]);
    // Same number, different instrument: still flagged.
    expect(unapproved(findCitations('Under the EU AI Act, Article 35 applies.', '', list))).toHaveLength(1);
  });
});

describe('stripping unapproved citations (fallback)', () => {
  it('removes every pinpoint from the spec examples and leaves readable text', () => {
    const report = { a: SPEC_EXAMPLES.join(' ') };
    const fixed = stripUnapprovedCitations(report);
    expect(unapproved(checkReport(fixed))).toEqual([]);
    expect(fixed.a).not.toMatch(/\s{2,}/);
    expect(fixed.a).not.toMatch(/\bthe the\b/i);
  });

  it('keeps arrays, numbers and other fields intact', () => {
    const fixed = stripUnapprovedCitations({ n: 5, list: [{ title: 'Fine', description: 'See Rule 6.3 here.' }] });
    expect(fixed.n).toBe(5);
    expect(fixed.list[0].title).toBe('Fine');
    expect(fixed.list[0].description).not.toMatch(/6\.3/);
  });
});
