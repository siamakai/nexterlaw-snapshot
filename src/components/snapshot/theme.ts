import type React from 'react';

// Design tokens — unchanged from the live app, except R_MUTED which is lightened
// slightly so small text meets WCAG 2.2 AA contrast on the navy background
// (was #5b7290, ~3.3:1; now #8a9fbd, ~5.6:1).

export const NAVY = '#1a3a6b';
export const GOLD = '#B8902A';
export const STEEL = '#5b7fa6';
export const BODY = '#3d3a35';

export const R_BG = '#0d1f3c';
export const R_CARD = '#132644';
export const R_BORDER = 'rgba(184,144,42,0.20)';
export const R_CREAM = '#ede8e0';
export const R_BODY = '#9fb0c8';
export const R_MUTED = '#8a9fbd';
export const R_INPUT = 'rgba(13,31,60,0.6)';
export const ERROR = '#f87171';
export const UNKNOWN_GREY = '#9ca3af';

export const ANSWER_STYLE = {
  YES: { border: '#16a34a', bg: '#f0fdf4', color: '#15803d' },
  NO: { border: '#dc2626', bg: '#fef2f2', color: '#b91c1c' },
  NOT_SURE: { border: '#d97706', bg: '#fffbeb', color: '#b45309' },
} as const;

export const headingStyle = (size = '1.75rem'): React.CSSProperties => ({
  fontFamily: 'var(--font-playfair)',
  color: R_CREAM,
  fontWeight: 700,
  fontSize: size,
  lineHeight: 1.25,
});

export const inputStyle = (hasError = false): React.CSSProperties => ({
  borderColor: hasError ? ERROR : R_BORDER,
  borderRadius: 2,
  backgroundColor: R_INPUT,
  color: R_CREAM,
});
