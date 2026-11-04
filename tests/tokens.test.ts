import { describe, expect, it } from 'vitest';
import { escapeHtml, generateResultToken, isResultToken, safeEqual } from '@/lib/security/tokens';
import { pdfPathFor } from '@/lib/security/report-access';

describe('result tokens', () => {
  it('are 32 url-safe characters and unique', () => {
    const tokens = new Set(Array.from({ length: 500 }, generateResultToken));
    expect(tokens.size).toBe(500);
    for (const t of tokens) expect(isResultToken(t)).toBe(true);
  });

  it('a cuid is not mistaken for a token', () => {
    expect(isResultToken('cmf1abcde0000xyz123456789')).toBe(false);
    expect(isResultToken('')).toBe(false);
    expect(isResultToken('../../etc/passwd________________')).toBe(false);
  });

  it('PDF path prefers the token and falls back to the id for old rows', () => {
    expect(pdfPathFor({ id: 'sub1', resultToken: 'T'.repeat(32) })).toBe(`/api/report/${'T'.repeat(32)}/pdf`);
    expect(pdfPathFor({ id: 'sub1', resultToken: null })).toBe('/api/report/sub1/pdf');
  });
});

describe('safeEqual', () => {
  it('compares exactly', () => {
    expect(safeEqual('secret', 'secret')).toBe(true);
    expect(safeEqual('secret', 'secreT')).toBe(false);
    expect(safeEqual('secret', 'secret-longer')).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('neutralises markup from form fields', () => {
    expect(escapeHtml('Smith & Co <a href="x">\'hi\'</a>')).toBe(
      'Smith &amp; Co &lt;a href=&quot;x&quot;&gt;&#39;hi&#39;&lt;/a&gt;',
    );
    expect(escapeHtml(null)).toBe('');
  });
});
