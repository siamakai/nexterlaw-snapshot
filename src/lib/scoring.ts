import { CLEAR_TRUST_DIMENSIONS } from './constants';
import { bandForScore, nextBand, type BandLabel, type BandMeta } from './bands';
import type { SelfAssessmentAnswers, ClearTrustScores, DimensionScore, SelfAssessmentAnswer } from '@/types';

/**
 * CLEAR TRUST scoring.
 *
 * Each dimension: Yes = 100, Not sure = 50, No = 0. Headline = plain average.
 *
 * Until v2 there was a size/sensitivity weighting here, but it multiplied both
 * the score and the maximum, so it cancelled out and the headline was already
 * a plain average. It has been removed: results are identical to before.
 * If weighting is wanted, implement a true weighted mean here (OPEN-DECISIONS #3).
 */
export const ANSWER_POINTS: Record<SelfAssessmentAnswer, number> = { YES: 100, NOT_SURE: 50, NO: 0 };

export function computeScores(answers: SelfAssessmentAnswers): ClearTrustScores {
  const dimensions: DimensionScore[] = CLEAR_TRUST_DIMENSIONS.map(dim => {
    const answer = (answers[dim.key] || 'NO') as SelfAssessmentAnswer;
    return { key: dim.key, name: dim.name, letter: dim.letter, score: ANSWER_POINTS[answer], answer };
  });

  const headline = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
  const band = bandForScore(headline);

  return {
    dimensions,
    headline,
    band: band.label,
    bandDisplayName: band.displayName,
    bandColour: band.colour,
  };
}

export interface NextBandHint {
  next: BandMeta | null;
  pointsNeeded: number;
  /** The fewest answers that would need to become "Yes", strongest gains first. */
  changes: Array<{ key: string; name: string; from: SelfAssessmentAnswer }>;
}

/**
 * "What moves you to the next band": the smallest set of answers that, if they
 * became "Yes", would lift the headline into the next band. No → Yes adds 10
 * points to the headline, Not sure → Yes adds 5.
 */
export function nextBandHint(scores: Pick<ClearTrustScores, 'dimensions' | 'headline' | 'band'>): NextBandHint {
  const next = nextBand(scores.band as BandLabel);
  if (!next) return { next: null, pointsNeeded: 0, changes: [] };

  const pointsNeeded = Math.max(0, next.min - scores.headline);
  const perDimension = 100 / scores.dimensions.length;
  const candidates = scores.dimensions
    .filter(d => d.answer !== 'YES')
    .map(d => ({ key: d.key, name: d.name, from: d.answer, gain: ((100 - d.score) / 100) * perDimension }))
    .sort((a, b) => b.gain - a.gain);

  const changes: NextBandHint['changes'] = [];
  let gained = 0;
  for (const c of candidates) {
    if (gained >= pointsNeeded) break;
    changes.push({ key: c.key, name: c.name, from: c.from });
    gained += c.gain;
  }
  return { next, pointsNeeded, changes };
}
