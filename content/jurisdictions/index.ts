// Jurisdiction notes for the Global Snapshot AI first draft (spec §2, Global step 4).
//
// Key: country name exactly as in GLOBAL_COUNTRIES. Value: plain-text research notes
// the team has written and checked (regulator, bar guidance on AI, data-protection
// law, any AI-specific rules), with sources. The AI draft may only use what is here;
// everything it writes is reviewed and approved by a person before it is sent.
//
// Empty on purpose: Claude Code must not write legal content for any country.
// [CONFIRM #7] Which countries first, and who writes and checks the notes.
// Template for a new entry: see ./TEMPLATE.md

export const JURISDICTION_NOTES: Record<string, string> = {};

export function notesFor(country: string): string | null {
  return JURISDICTION_NOTES[country]?.trim() || null;
}
