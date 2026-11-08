// Approved regulatory references (SNAPSHOT-V2-SPEC §4.2).
//
// After every report is generated, src/lib/reference-check.ts finds each
// *numbered* citation (Principle 7, Rule 6.3, para 4.2, Article 35, Annex III, …).
// A citation passes only if one of the entries below matches it (with its
// instrument name nearby). Anything else triggers a regeneration, then removal.
//
// THIS LIST IS DELIBERATELY EMPTY OF NUMBERED CITATIONS.
// The knowledge-base references are under review (docs/KB-REVIEW.md) and none
// has been confirmed by a solicitor yet. Until they are, reports name the
// instruments (e.g. "the SRA Code of Conduct", "UK GDPR") without pinpoint
// paragraph numbers. Add an entry only after it has been checked, and record who
// checked it and when. Claude Code must not add or edit entries ([CONFIRM #11]).

export interface ApprovedReference {
  id: string;
  /** Exact citation as it should appear, e.g. "UK GDPR, Article 35". */
  text: string;
  url: string;
  /** Tested against the citation plus ~60 characters before it. */
  match: RegExp;
  reviewedBy: string;
  reviewedOn: string; // YYYY-MM-DD
}

export const APPROVED_REFERENCES: ApprovedReference[] = [
  // Example of the expected shape (commented out until reviewed):
  // {
  //   id: 'uk-gdpr-art-35',
  //   text: 'UK GDPR, Article 35',
  //   url: 'https://www.legislation.gov.uk/eur/2016/679/article/35',
  //   match: /UK GDPR[^.]{0,60}Article\s+35\b|Article\s+35\b[^.]{0,20}UK GDPR/i,
  //   reviewedBy: '',
  //   reviewedOn: '',
  // },
];
