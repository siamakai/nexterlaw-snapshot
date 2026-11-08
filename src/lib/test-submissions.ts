// Test submissions (spec §5): an email ending @example.com or a firm name
// starting "ZZ TEST" is flagged isTest. Tests get no CRM sync, no follow-ups,
// no Google Sheets row, and are left out of benchmarks.
export function isTestSubmission(email: string, firmName: string): boolean {
  return /@example\.com$/i.test(email.trim()) || /^zz test/i.test(firmName.trim());
}
