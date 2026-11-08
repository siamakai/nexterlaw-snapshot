// Model comparison (spec §4.6 / Phase 3): run the same 10 fictional firms through
// one model and save the outputs for side-by-side review.
//
// THIS MAKES PAID ANTHROPIC API CALLS (10 reports per run). It refuses to run
// without --go. Use a LOCAL database with the seeded knowledge base, never production.
//
//   REPORT_MODEL=claude-opus-4-8   npx tsx --tsconfig tsconfig.json scripts/compare-models.ts --go
//   REPORT_MODEL=<faster model id> npx tsx --tsconfig tsconfig.json scripts/compare-models.ts --go
//
// Each run writes docs/model-comparison/<model>/<firm>.json and appends to summary.md.

import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import type { IntakeAnswers } from '../src/lib/intake';
import type { FirmSizeBand, IntakeData, SelfAssessmentAnswers } from '../src/types';

if (!process.argv.includes('--go')) {
  console.error('Refusing to run: this makes 10 paid API calls. Add --go once approved.');
  process.exit(1);
}
if (/neon\.tech|supabase|amazonaws|vercel-storage|prisma\.io/i.test(process.env.DATABASE_URL ?? '')) {
  console.error('Refusing to run against what looks like a hosted database. Use the local seeded database.');
  process.exit(1);
}

const Y = 'YES', N = 'NO', U = 'NOT_SURE';
const KEYS = ['compliance', 'literacy', 'explainability', 'accountability', 'rights', 'transparency', 'reliability', 'usageGovernance', 'security', 'traceability'] as const;
const ans = (s: string) => Object.fromEntries(KEYS.map((k, i) => [k, ({ Y, N, U } as Record<string, string>)[s[i]]])) as SelfAssessmentAnswers;

// Fictional firms covering every band, size, EU answer and intake rating.
const FIRMS: Array<{ id: string; name: string; size: FirmSizeBand; practices: string[]; eu: 'YES' | 'NO' | 'NOT_SURE'; answers: string; intake: IntakeAnswers }> = [
  { id: 'sole-family', name: 'ZZ TEST Ashdown Family Law', size: 'SOLE', practices: ['family'], eu: 'NO', answers: 'NNUNUNNNUN', intake: { outOfHours: 'VOICEMAIL_EMAIL', replySpeed: 'SAME_DAY', volume: 'UNDER_20', caseSystem: 'NONE' } },
  { id: 'micro-conveyancing', name: 'ZZ TEST Brook Conveyancing', size: 'MICRO', practices: ['conveyancing-property'], eu: 'NO', answers: 'UYNNUUYNUN', intake: { outOfHours: 'ANSWERING_SERVICE', replySpeed: 'NEXT_DAY_PLUS', volume: 'FROM_20_TO_50', caseSystem: 'LEAP' } },
  { id: 'small-pi-high-intake', name: 'ZZ TEST Carter Injury Solicitors', size: 'SMALL', practices: ['personal-injury'], eu: 'NO', answers: 'YUUYNNYUNU', intake: { outOfHours: 'VOICEMAIL_EMAIL', replySpeed: 'SAME_DAY', volume: 'FROM_50_TO_150', caseSystem: 'CLIO' } },
  { id: 'small-immigration-eu', name: 'ZZ TEST Dalton Immigration', size: 'SMALL', practices: ['immigration'], eu: 'YES', answers: 'UNNUUNUNNU', intake: { outOfHours: 'ON_CALL', replySpeed: 'WITHIN_HOUR', volume: 'FROM_20_TO_50', caseSystem: 'OTHER' } },
  { id: 'small-in-control', name: 'ZZ TEST Ellis Private Client', size: 'SMALL', practices: ['private-client-wills-probate'], eu: 'NO', answers: 'YYYYYYYUYY', intake: { outOfHours: 'AUTOMATED', replySpeed: 'UNDER_5_MIN', volume: 'UNDER_20', caseSystem: 'CLIO' } },
  { id: 'medium-corporate-eu', name: 'ZZ TEST Fenwick Corporate', size: 'MEDIUM', practices: ['corporate-ma', 'commercial-ip-it'], eu: 'YES', answers: 'YUYNUYUNUY', intake: { outOfHours: 'ON_CALL', replySpeed: 'SAME_DAY', volume: 'FROM_20_TO_50', caseSystem: 'OTHER' } },
  { id: 'medium-employment', name: 'ZZ TEST Grant Employment Law', size: 'MEDIUM', practices: ['employment'], eu: 'NOT_SURE', answers: 'UUUUUUUUUU', intake: { outOfHours: 'NOT_SURE', replySpeed: 'NOT_SURE', volume: 'NOT_SURE', caseSystem: 'NOT_SURE' } },
  { id: 'large-litigation', name: 'ZZ TEST Hale Litigation LLP', size: 'LARGE', practices: ['litigation-dispute-resolution'], eu: 'NO', answers: 'YYUYYUYYUY', intake: { outOfHours: 'ANSWERING_SERVICE', replySpeed: 'WITHIN_HOUR', volume: 'OVER_150', caseSystem: 'OTHER' } },
  { id: 'enterprise-full', name: 'ZZ TEST Ingram Full-Service', size: 'ENTERPRISE', practices: ['full-service'], eu: 'YES', answers: 'YYYYUYYYYY', intake: { outOfHours: 'AUTOMATED', replySpeed: 'WITHIN_HOUR', volume: 'OVER_150', caseSystem: 'OTHER' } },
  { id: 'micro-criminal-exposed', name: 'ZZ TEST Jarvis Criminal Defence', size: 'MICRO', practices: ['criminal'], eu: 'NO', answers: 'NNNNNNNNNN', intake: { outOfHours: 'ON_CALL', replySpeed: 'UNDER_5_MIN', volume: 'FROM_50_TO_150', caseSystem: 'NONE' } },
];

async function main() {
  // Loaded only after the guards above, so nothing connects anywhere without --go.
  const { computeScores } = await import('../src/lib/scoring');
  const { intakeRating } = await import('../src/lib/intake');
  const { retrieveKnowledgeBaseEntries } = await import('../src/lib/knowledge-retrieval');
  const { generateReport, PROMPT_VERSION } = await import('../src/lib/report-generator');
  const { checkReport, unapproved } = await import('../src/lib/reference-check');
  const model = (process.env.REPORT_MODEL ?? 'claude-opus-4-8').trim();
  const dir = `docs/model-comparison/${model}`;
  mkdirSync(dir, { recursive: true });
  const summary = 'docs/model-comparison/summary.md';
  if (!existsSync(summary)) {
    writeFileSync(summary, '# Model comparison\n\nSame 10 fictional firms per model. Judge on quality first, then speed (OPEN-DECISIONS #12).\n\n| Model | Firm | Score | Seconds | Output tokens | Cost (USD) | Unapproved citations |\n|---|---|---|---|---|---|---|\n');
  }

  for (const f of FIRMS) {
    const answers = ans(f.answers);
    const scores = computeScores(answers);
    const kb = await retrieveKnowledgeBaseEntries({ practiceTypes: f.practices, firmSize: f.size === 'SOLE' ? 'MICRO' : f.size, includeEuLayer: f.eu !== 'NO' });
    const intake: IntakeData = { firmName: f.name, firmWebsite: '', city: '', country: 'United Kingdom', practiceTypes: f.practices, firmSize: f.size, euFacing: f.eu, workEmail: 'test@example.com' };
    const t0 = Date.now();
    const result = await generateReport(intake, scores, kb, { intakeAnswers: f.intake, intakeRating: intakeRating(f.intake) });
    const secs = (Date.now() - t0) / 1000;
    const bad = unapproved(checkReport(result.report));
    writeFileSync(`${dir}/${f.id}.json`, JSON.stringify({ promptVersion: PROMPT_VERSION, model: result.modelUsed, seconds: secs, scores, unapprovedCitations: bad, report: result.report }, null, 2));
    appendFileSync(summary, `| ${result.modelUsed} | ${f.id} | ${Math.round(scores.headline)} | ${secs.toFixed(1)} | ${result.outputTokens} | ${result.estimatedCostUsd.toFixed(3)} | ${bad.length} |\n`);
    console.log(`${f.id}: ${secs.toFixed(1)}s, ${bad.length} unapproved citations`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
