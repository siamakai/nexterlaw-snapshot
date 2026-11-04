import type { Prisma } from '@prisma/client';
import { checkRateLimits, getClientIp, tooManyRequests } from './rate-limit';
import { isResultToken } from './tokens';

/**
 * Report and PDF links accept either:
 *  - the unguessable resultToken (all new links), or
 *  - the raw submission id (links in emails sent before this change).
 * Legacy id lookups get a tighter rate limit. Both are rate-limited per IP.
 */
export type ReportRefResolution =
  | { ok: true; where: Prisma.SubmissionWhereUniqueInput; legacy: boolean }
  | { ok: false; response: Response };

export async function resolveReportRef(
  req: Request,
  ref: string,
  kind: 'status' | 'pdf',
): Promise<ReportRefResolution> {
  const ip = getClientIp(req);
  const legacy = !isResultToken(ref);

  const limit = await checkRateLimits([
    [kind === 'pdf' ? 'pdf' : 'reportStatus', ip],
    ...(legacy ? [['reportLegacy', ip] as ['reportLegacy', string]] : []),
  ]);
  if (!limit.allowed) return { ok: false, response: tooManyRequests(limit) };

  return {
    ok: true,
    legacy,
    where: legacy ? { id: ref } : { resultToken: ref },
  };
}

/** The relative PDF link for a submission; prefers the token. */
export function pdfPathFor(submission: { id: string; resultToken: string | null }): string {
  return `/api/report/${submission.resultToken ?? submission.id}/pdf`;
}
