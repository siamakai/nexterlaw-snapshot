// Exports every knowledge-base entry that makes a regulatory claim to
// docs/KB-REVIEW.md for a solicitor to check (spec §4.1, Phase 2).
// Read-only: it does NOT change any entry. Run: npx tsx --tsconfig tsconfig.json scripts/export-kb-review.ts
//
// Note: this reads the seed file. Production rows may differ if they were edited
// in /admin/knowledge-base; re-run against a DB export before signing off.

import { writeFileSync } from 'node:fs';
import { KNOWLEDGE_BASE_ENTRIES } from '../src/lib/knowledge-base-seed';
import { findCitations } from '../src/lib/reference-check';

// The spec names these as known or suspected problems (§0.3, §4.1).
const SPEC_FLAGS: Array<[RegExp, string]> = [
  [/Principle\s+7[^.]{0,40}para(?:graph)?\s*4\.2|para(?:graph)?\s*4\.2[^.]{0,40}Principle\s+7/i, 'Spec: "SRA Principle 7 and Code para 4.2" cited for supervision — check the right provisions'],
  [/\bRule\s+6(?:\.3)?\b/i, 'Spec: "SRA Rule 6 / Rule 6.3" for confidentiality — check numbering and which Code'],
  [/para(?:graph)?\s*3\.2/i, 'Spec: "SRA Standards and Regulations, para 3.2" — check the instrument and paragraph'],
  [/Rule\s+8\.6/i, 'Spec: "Rule 8.6 (information about costs)" used for AI disclosure — likely the wrong rule'],
  [/Principle\s+4\b/i, 'Spec: every "Principle 4" use to be checked'],
  [/Accounts Rules/i, 'Phase 0: SRA Accounts Rules cited for file-keeping — check relevance'],
  [/Code for Firms[^.]{0,20}2\.1/i, 'Phase 0: "Code for Firms para 2.1" — check'],
  [/Article\s+52|Title\s+X\b|Articles?\s+51/i, 'Phase 0: EU AI Act article/title numbering — check against the final text'],
];

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n+/g, ' ');

const reviewCategories = new Set(['REGULATORY_GUIDANCE', 'RISK_LIBRARY', 'CONDITIONAL_EU_LAYER']);
const rows = KNOWLEDGE_BASE_ENTRIES
  .map((e, i) => ({ e, i }))
  .filter(({ e }) => reviewCategories.has(e.category) || findCitations(`${e.bodyText} ${e.sourceReference ?? ''}`).length > 0);

const lines = [
  '# Knowledge-base review',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} from \`src/lib/knowledge-base-seed.ts\` by \`scripts/export-kb-review.ts\`. **No entry has been changed.**`,
  '',
  'For each row: confirm or correct the text and the source reference, then fill in **Reviewer** and **Date**.',
  'Until a pinpoint citation is approved here and added to `content/approved-references.ts`, the report generator removes it from reports.',
  '',
  'Covers every REGULATORY_GUIDANCE, RISK_LIBRARY and CONDITIONAL_EU_LAYER entry, plus any other entry that cites a numbered provision.',
  'Production rows may differ from the seed if edited in admin; export the live table before final sign-off.',
  '',
  `Entries: ${rows.length}`,
  '',
  '| # | Category | Title | Text | Source reference | Pinpoint citations found | Suspected issue | Reviewer | Date |',
  '|---|---|---|---|---|---|---|---|---|',
];

for (const { e, i } of rows) {
  const all = `${e.bodyText} ${e.sourceReference ?? ''}`;
  const cites = [...new Set(findCitations(all).map(f => f.citation))];
  const issues = SPEC_FLAGS.filter(([re]) => re.test(all)).map(([, msg]) => msg);
  if (cites.length && !issues.length) issues.push('Pinpoint citation: verify number and instrument');
  lines.push(`| ${i + 1} | ${e.category} | ${esc(e.title)} | ${esc(e.bodyText)} | ${esc(e.sourceReference ?? '—')} | ${esc(cites.join('; ') || '—')} | ${esc(issues.join('<br>') || '—')} |  |  |`);
}

writeFileSync('docs/KB-REVIEW.md', `${lines.join('\n')}\n`);
console.log(`Wrote docs/KB-REVIEW.md (${rows.length} entries).`);
