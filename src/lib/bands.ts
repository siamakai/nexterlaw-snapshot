// Single source of truth for the CLEAR TRUST score bands.
// Everything else (API, PDF, admin, results page, prompt) imports from here.

export type BandLabel = 'EXPOSED' | 'DEVELOPING' | 'IN_CONTROL';

export interface BandMeta {
  label: BandLabel;
  min: number;
  max: number;
  displayName: string;
  colour: string;
  /** Tailwind classes for the admin tables. */
  adminClass: string;
}

export const BANDS: readonly BandMeta[] = [
  { label: 'EXPOSED',    min: 0,  max: 39,  displayName: 'Exposed',    colour: '#ef4444', adminClass: 'bg-red-100 text-red-700' },
  { label: 'DEVELOPING', min: 40, max: 69,  displayName: 'Developing', colour: '#f59e0b', adminClass: 'bg-amber-100 text-amber-700' },
  { label: 'IN_CONTROL', min: 70, max: 100, displayName: 'In Control', colour: '#22c55e', adminClass: 'bg-green-100 text-green-700' },
] as const;

/**
 * Band for a headline score. Uses lower bounds only, so there are no gaps
 * (39.4 is Exposed, not "no match → In Control" as in the old lookup).
 */
export function bandForScore(score: number): BandMeta {
  if (score >= 70) return BANDS[2];
  if (score >= 40) return BANDS[1];
  return BANDS[0];
}

export function bandMeta(label: string | null | undefined): BandMeta {
  return BANDS.find(b => b.label === label) ?? BANDS[0];
}

export function nextBand(label: BandLabel): BandMeta | null {
  const i = BANDS.findIndex(b => b.label === label);
  return i >= 0 && i < BANDS.length - 1 ? BANDS[i + 1] : null;
}

/** Colour for a single dimension score (0 / 50 / 100). */
export function dimensionColour(score: number): string {
  return bandForScore(score).colour;
}
