import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limits for public endpoints (Upstash; already a dependency).
 *
 * If Upstash isn't configured or is unreachable we FAIL OPEN (allow the
 * request) and log, so the Snapshot keeps working. See OPEN-DECISIONS N5.
 * Limits are deliberately generous for real firms (a whole office behind one
 * IP after a webinar) but stop scripted abuse of paid report generation.
 */
type Window = `${number} ${'s' | 'm' | 'h' | 'd'}`;

export const RATE_LIMITS = {
  submitIp:          { requests: 10,  window: '1 h' as Window },
  submitEmail:       { requests: 3,   window: '1 h' as Window },
  submitGlobalIp:    { requests: 10,  window: '1 h' as Window },
  submitGlobalEmail: { requests: 3,   window: '1 h' as Window },
  // The results screen polls every 3 s for ~1–2 minutes.
  reportStatus:      { requests: 120, window: '1 m' as Window },
  // Legacy links that use the raw submission id (old emails): tighter.
  reportLegacy:      { requests: 20,  window: '1 m' as Window },
  pdf:               { requests: 20,  window: '1 m' as Window },
  // Results-page buttons: "email me", reminder, next-step click.
  resultAction:      { requests: 10,  window: '1 h' as Window },
  resultPage:        { requests: 60,  window: '1 m' as Window },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (only meaningful when blocked). */
  retryAfter: number;
}

let redis: Redis | null | undefined;
const limiters = new Map<RateLimitName, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('[rate-limit] Upstash not configured; rate limiting is disabled.');
    redis = null;
  } else {
    redis = new Redis({ url, token });
  }
  return redis;
}

function getLimiter(name: RateLimitName): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    const { requests, window } = RATE_LIMITS[name];
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `snapshot:rl:${name}`,
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

export async function checkRateLimit(name: RateLimitName, key: string): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) return { allowed: true, retryAfter: 0 };
  try {
    const { success, reset } = await limiter.limit(key.toLowerCase());
    return { allowed: success, retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (err) {
    console.error(`[rate-limit] ${name} check failed; allowing request:`, err);
    return { allowed: true, retryAfter: 0 };
  }
}

/** Checks several limits; the first one that blocks wins. */
export async function checkRateLimits(
  checks: Array<[RateLimitName, string]>,
): Promise<RateLimitResult> {
  for (const [name, key] of checks) {
    const result = await checkRateLimit(name, key);
    if (!result.allowed) return result;
  }
  return { allowed: true, retryAfter: 0 };
}

export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: 'Too many requests. Please wait a little and try again.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
  );
}

/** Client IP as seen by Vercel (first x-forwarded-for hop). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Test hook: forget cached clients so env changes take effect. */
export function __resetRateLimitForTests(): void {
  redis = undefined;
  limiters.clear();
}
