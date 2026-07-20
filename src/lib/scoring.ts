import { CLEAR_TRUST_DIMENSIONS, SCORE_BANDS } from './constants';
import type { SelfAssessmentAnswers, FirmSizeBand, ClearTrustScores, DimensionScore } from '@/types';

// Base points per answer
const BASE_POINTS = { YES: 10, NOT_SURE: 5, NO: 0 };

// Weight multipliers per dimension × firm size — Security and Rights weigh heavier
// for firms handling high-sensitivity matters (Criminal, Family, Immigration tend to
// be smaller; Corporate/M&A and full-service tend to be larger).
const DIMENSION_WEIGHTS: Record<string, Partial<Record<FirmSizeBand, number>>> = {
  compliance:      { MICRO: 1.0, SMALL: 1.0, MEDIUM: 1.1, LARGE: 1.2, ENTERPRISE: 1.3 },
  literacy:        { MICRO: 1.0, SMALL: 1.0, MEDIUM: 1.0, LARGE: 1.1, ENTERPRISE: 1.2 },
  explainability:  { MICRO: 0.9, SMALL: 1.0, MEDIUM: 1.0, LARGE: 1.1, ENTERPRISE: 1.2 },
  accountability:  { MICRO: 0.8, SMALL: 1.0, MEDIUM: 1.1, LARGE: 1.2, ENTERPRISE: 1.3 },
  rights:          { MICRO: 1.1, SMALL: 1.1, MEDIUM: 1.2, LARGE: 1.3, ENTERPRISE: 1.4 },
  transparency:    { MICRO: 1.0, SMALL: 1.0, MEDIUM: 1.0, LARGE: 1.0, ENTERPRISE: 1.1 },
  reliability:     { MICRO: 1.0, SMALL: 1.0, MEDIUM: 1.1, LARGE: 1.1, ENTERPRISE: 1.2 },
  usageGovernance: { MICRO: 0.9, SMALL: 1.0, MEDIUM: 1.1, LARGE: 1.2, ENTERPRISE: 1.3 },
  security:        { MICRO: 1.1, SMALL: 1.2, MEDIUM: 1.3, LARGE: 1.4, ENTERPRISE: 1.5 },
  traceability:    { MICRO: 1.0, SMALL: 1.0, MEDIUM: 1.1, LARGE: 1.2, ENTERPRISE: 1.3 },
};

// Practice types that raise the security/rights weight (high-sensitivity data)
const HIGH_SENSITIVITY_PRACTICES = [
  'criminal', 'family', 'immigration', 'private-client-wills-probate',
];

export function computeScores(
  answers: SelfAssessmentAnswers,
  firmSize: FirmSizeBand,
  practiceTypes: string[],
): ClearTrustScores {
  const isHighSensitivity = practiceTypes.some(pt =>
    HIGH_SENSITIVITY_PRACTICES.some(h => pt.includes(h.split('-')[0])),
  );

  const dimensions: DimensionScore[] = CLEAR_TRUST_DIMENSIONS.map(dim => {
    const answer = answers[dim.key];
    const basePoints = answer ? BASE_POINTS[answer] : 0;
    const sizeWeight = DIMENSION_WEIGHTS[dim.key]?.[firmSize] ?? 1.0;

    // Boost security & rights by 10% for high-sensitivity practices
    const sensitivityBoost =
      isHighSensitivity && (dim.key === 'security' || dim.key === 'rights') ? 1.1 : 1.0;

    // Raw weighted score (max would be 10 × weight)
    const rawScore = basePoints * sizeWeight * sensitivityBoost;

    // Max possible for this dimension
    const maxScore = 10 * sizeWeight * sensitivityBoost;

    // Normalise to 0–100
    const score = Math.min(100, (rawScore / maxScore) * 100);

    return {
      key: dim.key,
      name: dim.name,
      letter: dim.letter,
      score,
      answer: answer || 'NO',
    };
  });

  const headline = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;

  const band = SCORE_BANDS.find(b => headline >= b.min && headline <= b.max) ?? SCORE_BANDS[2];

  return {
    dimensions,
    headline,
    band: band.label,
    bandDisplayName: band.displayName,
    bandColour: band.colour,
  };
}
