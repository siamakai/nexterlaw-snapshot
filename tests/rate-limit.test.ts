import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const limitMock = vi.fn();
vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = vi.fn(() => 'window');
    limit = (key: string) => limitMock(key);
  }
  return { Ratelimit };
});
vi.mock('@upstash/redis', () => ({ Redis: class {} }));

import {
  __resetRateLimitForTests,
  checkRateLimit,
  checkRateLimits,
  getClientIp,
  tooManyRequests,
} from '@/lib/security/rate-limit';

function configureUpstash(on: boolean) {
  process.env.UPSTASH_REDIS_REST_URL = on ? 'https://example.upstash.io' : '';
  process.env.UPSTASH_REDIS_REST_TOKEN = on ? 'test-token' : '';
  __resetRateLimitForTests();
}

beforeEach(() => {
  limitMock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => configureUpstash(false));

describe('checkRateLimit', () => {
  it('allows everything when Upstash is not configured (fail open)', async () => {
    configureUpstash(false);
    expect(await checkRateLimit('submitIp', '1.2.3.4')).toEqual({ allowed: true, retryAfter: 0 });
    expect(limitMock).not.toHaveBeenCalled();
  });

  it('blocks when the limiter says no, with a retry time', async () => {
    configureUpstash(true);
    limitMock.mockResolvedValue({ success: false, reset: Date.now() + 30_000 });
    const result = await checkRateLimit('submitIp', '1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('lower-cases keys so email limits can’t be dodged with capitals', async () => {
    configureUpstash(true);
    limitMock.mockResolvedValue({ success: true, reset: Date.now() });
    await checkRateLimit('submitEmail', 'Partner@Firm.co.uk');
    expect(limitMock).toHaveBeenCalledWith('partner@firm.co.uk');
  });

  it('fails open if Upstash errors', async () => {
    configureUpstash(true);
    limitMock.mockRejectedValue(new Error('network down'));
    expect((await checkRateLimit('pdf', 'ip')).allowed).toBe(true);
  });

  it('checkRateLimits stops at the first block', async () => {
    configureUpstash(true);
    limitMock
      .mockResolvedValueOnce({ success: true, reset: Date.now() })
      .mockResolvedValueOnce({ success: false, reset: Date.now() + 5000 });
    const result = await checkRateLimits([['reportStatus', 'ip'], ['reportLegacy', 'ip'], ['pdf', 'ip']]);
    expect(result.allowed).toBe(false);
    expect(limitMock).toHaveBeenCalledTimes(2);
  });
});

describe('helpers', () => {
  it('tooManyRequests returns 429 with Retry-After', async () => {
    const res = tooManyRequests({ allowed: false, retryAfter: 42 });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
  });

  it('getClientIp uses the first forwarded hop', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } });
    expect(getClientIp(req)).toBe('203.0.113.9');
    expect(getClientIp(new Request('http://x'))).toBe('unknown');
  });
});
