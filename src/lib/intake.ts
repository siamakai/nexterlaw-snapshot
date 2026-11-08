// Client-intake questions (v2). Not part of the CLEAR TRUST score; they produce
// an Intake Opportunity rating used for routing and the report's intake note.
// Thresholds per SNAPSHOT-V2-SPEC §2 — [CONFIRM] in OPEN-DECISIONS #5.

export const INTAKE_QUESTIONS = [
  {
    key: 'outOfHours' as const,
    question: 'What happens to new enquiries outside office hours?',
    options: [
      { value: 'VOICEMAIL_EMAIL', label: 'Voicemail or email only' },
      { value: 'ANSWERING_SERVICE', label: 'Answering service' },
      { value: 'ON_CALL', label: 'Someone on call' },
      { value: 'AUTOMATED', label: 'Automated or AI intake' },
      { value: 'NOT_SURE', label: 'Not sure' },
    ],
  },
  {
    key: 'replySpeed' as const,
    question: 'How quickly do you usually reply to a new enquiry?',
    options: [
      { value: 'UNDER_5_MIN', label: 'Under 5 minutes' },
      { value: 'WITHIN_HOUR', label: 'Within an hour' },
      { value: 'SAME_DAY', label: 'Same day' },
      { value: 'NEXT_DAY_PLUS', label: 'Next day or later' },
      { value: 'NOT_SURE', label: 'Not sure' },
    ],
  },
  {
    key: 'volume' as const,
    question: 'Roughly how many new enquiries do you get a month?',
    options: [
      { value: 'UNDER_20', label: 'Under 20' },
      { value: 'FROM_20_TO_50', label: '20–50' },
      { value: 'FROM_50_TO_150', label: '50–150' },
      { value: 'OVER_150', label: '150+' },
      { value: 'NOT_SURE', label: 'Not sure' },
    ],
  },
  {
    key: 'caseSystem' as const,
    question: 'Which case-management system do you use?',
    options: [
      { value: 'CLIO', label: 'Clio' },
      { value: 'LEAP', label: 'LEAP' },
      { value: 'OTHER', label: 'Other' },
      { value: 'NONE', label: 'None or spreadsheets' },
      { value: 'NOT_SURE', label: 'Not sure' },
    ],
  },
] as const;

export type IntakeKey = (typeof INTAKE_QUESTIONS)[number]['key'];
export type IntakeAnswers = Record<IntakeKey, string>;
export type IntakeRating = 'HIGH' | 'MEDIUM' | 'LOW';

export const EMPTY_INTAKE_ANSWERS: IntakeAnswers = { outOfHours: '', replySpeed: '', volume: '', caseSystem: '' };

export const INTAKE_VALUES: Record<IntakeKey, readonly string[]> = Object.fromEntries(
  INTAKE_QUESTIONS.map(q => [q.key, q.options.map(o => o.value)]),
) as unknown as Record<IntakeKey, readonly string[]>;

export function intakeLabel(key: IntakeKey, value: string | null | undefined): string {
  const q = INTAKE_QUESTIONS.find(x => x.key === key);
  return q?.options.find(o => o.value === value)?.label ?? 'Not answered';
}

/**
 * HIGH: out of hours = voicemail/email only, OR reply = next day or later,
 *       OR (≥ 50 enquiries a month AND reply is same day or slower)
 * LOW:  automated intake already in place AND reply under an hour
 * MEDIUM: everything else
 */
export function intakeRating(a: Partial<IntakeAnswers>): IntakeRating {
  const highVolume = a.volume === 'FROM_50_TO_150' || a.volume === 'OVER_150';
  const slowReply = a.replySpeed === 'SAME_DAY' || a.replySpeed === 'NEXT_DAY_PLUS';

  if (a.outOfHours === 'VOICEMAIL_EMAIL' || a.replySpeed === 'NEXT_DAY_PLUS' || (highVolume && slowReply)) {
    return 'HIGH';
  }
  if (a.outOfHours === 'AUTOMATED' && (a.replySpeed === 'UNDER_5_MIN' || a.replySpeed === 'WITHIN_HOUR')) {
    return 'LOW';
  }
  return 'MEDIUM';
}

export const INTAKE_RATING_LABEL: Record<IntakeRating, string> = {
  HIGH: 'High opportunity',
  MEDIUM: 'Some opportunity',
  LOW: 'Low opportunity',
};
