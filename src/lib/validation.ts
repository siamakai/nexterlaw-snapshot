import { z } from 'zod';
import { INTAKE_VALUES } from './intake';

export const AnswerEnum = z.enum(['YES', 'NO', 'NOT_SURE']);

export const SelfAssessmentSchema = z.object({
  compliance: AnswerEnum,
  literacy: AnswerEnum,
  explainability: AnswerEnum,
  accountability: AnswerEnum,
  rights: AnswerEnum,
  transparency: AnswerEnum,
  reliability: AnswerEnum,
  usageGovernance: AnswerEnum,
  security: AnswerEnum,
  traceability: AnswerEnum,
});

const intakeField = (values: readonly string[]) =>
  z.union([z.literal(''), z.enum(values as [string, ...string[]])]).default('');

/** The four client-intake answers. Optional: an empty answer is allowed. */
export const IntakeAnswersSchema = z
  .object({
    outOfHours: intakeField(INTAKE_VALUES.outOfHours),
    replySpeed: intakeField(INTAKE_VALUES.replySpeed),
    volume: intakeField(INTAKE_VALUES.volume),
    caseSystem: intakeField(INTAKE_VALUES.caseSystem),
  })
  .default({ outOfHours: '', replySpeed: '', volume: '', caseSystem: '' });

/** Optional website: empty, or something that looks like a domain/URL. */
export const WebsiteSchema = z
  .string()
  .trim()
  .max(500)
  .default('')
  .refine(v => v === '' || isLikelyWebsite(v), { message: 'Please enter a valid website, e.g. www.yourfirm.co.uk' });

export function isLikelyWebsite(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname) && !/\s/.test(v);
  } catch {
    return false;
  }
}

export const ConsentSchema = z.object({
  /** Required: "general information, not legal or regulatory advice". */
  advice: z.literal(true),
  /** Optional, unticked by default: contact about results and related services. */
  marketing: z.boolean().default(false),
});

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
