// Site-wide settings and feature switches.
// Anything marked [CONFIRM] is a placeholder awaiting a decision in docs/OPEN-DECISIONS.md.
// URLs come from environment variables so they can change without a code change;
// an unset URL never produces a broken link (see linkOrContact()).

const env = (name: string): string => (process.env[name] ?? '').trim();

export const SITE = {
  appUrl: env('NEXT_PUBLIC_APP_URL') || 'https://snapshotapp.nexterlaw.com',
  contactEmail: 'hello@nexterlaw.com', // already used in the live app's error messages
  // Where replies to Snapshot emails go (decided 10 Nov 2026).
  replyToEmail: 'services@nexterai.agency',
  privacyVersion: env('NEXT_PUBLIC_PRIVACY_VERSION') || '1.0',
  // [CONFIRM #8] Privacy notice URL. Until set, the link opens an email to the contact address.
  privacyUrl: env('NEXT_PUBLIC_PRIVACY_URL'),
  // [CONFIRM] Brand line (spec §2 landing).
  brandLine: 'CLEAR TRUST is a NexterLaw framework · A Nexter AI Group service',
  trust: {
    // [CONFIRM] Spec §2 trust block wording and photo.
    creatorLine: 'Created by Dr Siamak Goudarzi, former judge and former managing partner of UK law firms',
    photoUrl: env('NEXT_PUBLIC_CREATOR_PHOTO_URL'), // empty → monogram
    // [CONFIRM] Sample report (fictional firm). Hidden until set.
    sampleReportUrl: env('NEXT_PUBLIC_SAMPLE_REPORT_URL'),
  },
  global: {
    turnaroundHours: 48,
    // V2-PLAN C9 / OPEN-DECISIONS U5: the live app shows no score for Global;
    // the spec wants the instant score. Default follows the spec; set to "false" to hide.
    showScore: env('NEXT_PUBLIC_GLOBAL_SHOW_SCORE') !== 'false',
    // Waitlist switch for when the team is overloaded (off by default).
    waitlist: env('NEXT_PUBLIC_GLOBAL_WAITLIST') === 'true',
  },
  // Benchmark block appears once a size band has at least this many completed reports.
  benchmarkMinSample: 30,
  // After this long the building screen shows the score and promises the report by email.
  reportTimeoutSeconds: 120,
  // [CONFIRM #4] Rename dimension 5 "Rights" → "Rights & Confidentiality".
  renameRights: env('NEXT_PUBLIC_RENAME_RIGHTS') === 'true',
} as const;

/** Mailto fallback so an unset URL still does something honest and useful. */
export function contactHref(subject: string): string {
  return `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}`;
}

export function linkOrContact(url: string, subject: string): string {
  return url || contactHref(subject);
}

export function privacyHref(): string {
  return linkOrContact(SITE.privacyUrl, 'Privacy notice');
}
