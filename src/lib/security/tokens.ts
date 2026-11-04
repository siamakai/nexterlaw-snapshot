import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Unguessable token for result/report links. 24 random bytes → 32 base64url
 * characters. Separate from the submission cuid, which stays internal.
 */
export function generateResultToken(): string {
  return randomBytes(24).toString('base64url');
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function isResultToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

/** Constant-time string comparison for shared secrets. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Escape text for safe use inside HTML emails. */
export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
