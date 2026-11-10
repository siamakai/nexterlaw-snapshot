import { describe, expect, it } from 'vitest';
import { computeScores, nextBandHint } from '@/lib/scoring';
import { bandForScore } from '@/lib/bands';
import { intakeRating } from '@/lib/intake';
import { chooseRoute, sizeGroupGlobal, sizeGroupUk } from '@/lib/routing';
import { isTestSubmission } from '@/lib/test-submissions';
import { isLikelyWebsite } from '@/lib/validation';
import type { SelfAssessmentAnswers } from '@/types';

const KEYS = ['compliance', 'literacy', 'explainability', 'accountability', 'rights', 'transparency', 'reliability', 'usageGovernance', 'security', 'traceability'] as const;
const answers = (...vals: Array<'YES' | 'NO' | 'NOT_SURE'>): SelfAssessmentAnswers =>
  Object.fromEntries(KEYS.map((k, i) => [k, vals[i] ?? vals[vals.length - 1]])) as SelfAssessmentAnswers;

describe('scoring', () => {
  it('Yes = 100, Not sure = 50, No = 0; headline is the plain average', () => {
    expect(computeScores(answers('YES')).headline).toBe(100);
    expect(computeScores(answers('NO')).headline).toBe(0);
    expect(computeScores(answers('NOT_SURE')).headline).toBe(50);
    const mixed = computeScores(answers('YES', 'YES', 'YES', 'NO', 'NO', 'NOT_SURE', 'NOT_SURE', 'NO', 'NO', 'NO'));
    expect(mixed.headline).toBe(40);
    expect(mixed.band).toBe('DEVELOPING');
  });

  it('bands have no gaps (39.4 is Exposed, not In Control)', () => {
    expect(bandForScore(0).label).toBe('EXPOSED');
    expect(bandForScore(39.4).label).toBe('EXPOSED');
    expect(bandForScore(39.99).label).toBe('EXPOSED');
    expect(bandForScore(40).label).toBe('DEVELOPING');
    expect(bandForScore(69.9).label).toBe('DEVELOPING');
    expect(bandForScore(70).label).toBe('IN_CONTROL');
    expect(bandForScore(100).label).toBe('IN_CONTROL');
  });

  it('matches the old weighted formula (weights cancelled out)', () => {
    // Old: raw = base × w, max = 10 × w → (base/10)×100. Same as the new points.
    const s = computeScores(answers('YES', 'NOT_SURE', 'NO'));
    expect(s.dimensions.map(d => d.score)).toEqual([100, 50, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('next-band hint picks the fewest answers, No before Not sure', () => {
    const s = computeScores(answers('YES', 'YES', 'YES', 'NOT_SURE', 'NO', 'NO', 'NO', 'NO', 'NO', 'NO')); // 35
    const hint = nextBandHint(s);
    expect(hint.next?.label).toBe('DEVELOPING');
    expect(hint.pointsNeeded).toBe(5);
    expect(hint.changes).toHaveLength(1);
    expect(hint.changes[0].from).toBe('NO');
  });

  it('no hint above the top band', () => {
    expect(nextBandHint(computeScores(answers('YES'))).next).toBeNull();
  });
});

describe('intake rating (spec §2)', () => {
  it('HIGH: voicemail/email only out of hours', () => {
    expect(intakeRating({ outOfHours: 'VOICEMAIL_EMAIL', replySpeed: 'UNDER_5_MIN' })).toBe('HIGH');
  });
  it('HIGH: reply next day or later', () => {
    expect(intakeRating({ outOfHours: 'AUTOMATED', replySpeed: 'NEXT_DAY_PLUS' })).toBe('HIGH');
  });
  it('HIGH: ≥50 enquiries and same-day reply', () => {
    expect(intakeRating({ outOfHours: 'ON_CALL', replySpeed: 'SAME_DAY', volume: 'FROM_50_TO_150' })).toBe('HIGH');
    expect(intakeRating({ outOfHours: 'ON_CALL', replySpeed: 'SAME_DAY', volume: 'OVER_150' })).toBe('HIGH');
  });
  it('LOW: automated intake and reply within the hour', () => {
    expect(intakeRating({ outOfHours: 'AUTOMATED', replySpeed: 'WITHIN_HOUR', volume: 'OVER_150' })).toBe('LOW');
    expect(intakeRating({ outOfHours: 'AUTOMATED', replySpeed: 'UNDER_5_MIN' })).toBe('LOW');
  });
  it('MEDIUM otherwise (including all Not sure)', () => {
    expect(intakeRating({ outOfHours: 'ON_CALL', replySpeed: 'SAME_DAY', volume: 'UNDER_20' })).toBe('MEDIUM');
    expect(intakeRating({ outOfHours: 'NOT_SURE', replySpeed: 'NOT_SURE', volume: 'NOT_SURE', caseSystem: 'NOT_SURE' })).toBe('MEDIUM');
    expect(intakeRating({})).toBe('MEDIUM');
  });
});

describe('next-step routing: one case per table row (spec §3)', () => {
  const base = { path: 'UK' as const, euFacing: 'NO' as const, band: 'DEVELOPING' as const, intakeRating: 'MEDIUM' as const };

  it('row 1: Global path → GLOBAL (whatever else is true)', () => {
    expect(chooseRoute({ ...base, path: 'GLOBAL', sizeGroup: 'TWENTY_ONE_PLUS' })).toBe('GLOBAL');
    expect(chooseRoute({ ...base, path: 'GLOBAL', sizeGroup: 'SOLE', intakeRating: 'HIGH' })).toBe('GLOBAL');
  });
  it('row 2a: 21+ → governance review', () => {
    expect(chooseRoute({ ...base, sizeGroup: 'TWENTY_ONE_PLUS', intakeRating: 'HIGH' })).toBe('GOVERNANCE_REVIEW');
  });
  it('row 2b: EU = Yes and Exposed/Developing → governance review, even for small firms', () => {
    expect(chooseRoute({ ...base, sizeGroup: 'TWO_TO_TWENTY', euFacing: 'YES', band: 'EXPOSED' })).toBe('GOVERNANCE_REVIEW');
    expect(chooseRoute({ ...base, sizeGroup: 'SOLE', euFacing: 'YES', band: 'DEVELOPING' })).toBe('GOVERNANCE_REVIEW');
  });
  it('row 2b does not apply when In Control or EU is only "Not sure"', () => {
    expect(chooseRoute({ ...base, sizeGroup: 'TWO_TO_TWENTY', euFacing: 'YES', band: 'IN_CONTROL' })).toBe('SNAPSHOT_REVIEW');
    expect(chooseRoute({ ...base, sizeGroup: 'TWO_TO_TWENTY', euFacing: 'NOT_SURE', band: 'EXPOSED' })).toBe('SNAPSHOT_REVIEW');
  });
  it('row 3: 2–20 with High intake opportunity → intake review', () => {
    expect(chooseRoute({ ...base, sizeGroup: 'TWO_TO_TWENTY', intakeRating: 'HIGH' })).toBe('INTAKE_REVIEW');
  });
  it('row 4: other 2–20 → Snapshot review', () => {
    expect(chooseRoute({ ...base, sizeGroup: 'TWO_TO_TWENTY', intakeRating: 'LOW' })).toBe('SNAPSHOT_REVIEW');
  });
  it('row 5: just me → Skool', () => {
    expect(chooseRoute({ ...base, sizeGroup: 'SOLE', intakeRating: 'HIGH' })).toBe('SKOOL');
  });
  it('size groups', () => {
    expect(sizeGroupUk('SOLE')).toBe('SOLE');
    expect(sizeGroupUk('MICRO')).toBe('TWO_TO_TWENTY');
    expect(sizeGroupUk('SMALL')).toBe('TWO_TO_TWENTY');
    expect(sizeGroupUk('MEDIUM')).toBe('TWENTY_ONE_PLUS');
    expect(sizeGroupGlobal('solo')).toBe('SOLE');
    expect(sizeGroupGlobal('2-10')).toBe('TWO_TO_TWENTY');
    expect(sizeGroupGlobal('11-50')).toBe('TWENTY_ONE_PLUS');
  });
});

describe('test submissions and website check', () => {
  it('flags @example.com and "ZZ TEST" firms', () => {
    expect(isTestSubmission('qa-test@example.com', 'Real Firm')).toBe(true);
    expect(isTestSubmission('a@firm.co.uk', 'ZZ TEST Nexter QA Firm (fake)')).toBe(true);
    expect(isTestSubmission('a@firm.co.uk', 'zz test lowercase')).toBe(true);
    expect(isTestSubmission('a@example.co.uk', 'Smith & Co')).toBe(false);
  });
  it('accepts normal websites, rejects junk', () => {
    for (const ok of ['www.smith.co.uk', 'https://smith.law', 'smith-partners.com/about']) expect(isLikelyWebsite(ok)).toBe(true);
    for (const bad of ['smith', 'not a website', 'http://', 'www']) expect(isLikelyWebsite(bad)).toBe(false);
  });
});

describe('next-step provider wording in the report', () => {
  it('agency routes name Nexter AI Agency as our service provision partner', async () => {
    const { providerPhraseFor } = await import('@/config/next-steps');
    expect(providerPhraseFor('INTAKE_REVIEW')).toBe('Nexter AI Agency, our service provision partner');
    expect(providerPhraseFor('SNAPSHOT_REVIEW')).toBe('Nexter AI Agency, our service provision partner');
    expect(providerPhraseFor('GOVERNANCE_REVIEW')).toBe('NexterLaw');
    expect(providerPhraseFor('GLOBAL')).toBe('NexterLaw');
    expect(providerPhraseFor('SKOOL')).toBe('the Nexter AI Business Club');
  });
});
