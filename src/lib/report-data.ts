// Turns database rows into the shapes the results page, API and PDF use.
// One place for this logic (previously copied into three routes).

import type { GeneratedReport, Prisma } from '@prisma/client';
import { CLEAR_TRUST_DIMENSIONS, type DimensionKey } from './constants';
import { bandMeta } from './bands';
import { computeScores } from './scoring';
import type { ClearTrustScores, GeneratedReportContent, SelfAssessmentAnswer, SelfAssessmentAnswers } from '@/types';

const ANSWER_FIELD: Record<DimensionKey, string> = {
  compliance: 'answerCompliance', literacy: 'answerLiteracy', explainability: 'answerExplainability',
  accountability: 'answerAccountability', rights: 'answerRights', transparency: 'answerTransparency',
  reliability: 'answerReliability', usageGovernance: 'answerUsageGovernance', security: 'answerSecurity',
  traceability: 'answerTraceability',
};

const SCORE_FIELD: Record<DimensionKey, string> = {
  compliance: 'scoreCompliance', literacy: 'scoreLiteracy', explainability: 'scoreExplainability',
  accountability: 'scoreAccountability', rights: 'scoreRights', transparency: 'scoreTransparency',
  reliability: 'scoreReliability', usageGovernance: 'scoreUsageGovernance', security: 'scoreSecurity',
  traceability: 'scoreTraceability',
};

type AnswerRow = Record<string, unknown>;

/** The ten answers stored on a Submission or GlobalSubmission row. */
export function answersFromRow(row: AnswerRow): SelfAssessmentAnswers {
  return Object.fromEntries(
    CLEAR_TRUST_DIMENSIONS.map(d => [d.key, (row[ANSWER_FIELD[d.key]] as SelfAssessmentAnswer) ?? '']),
  ) as SelfAssessmentAnswers;
}

/** Score fields to write for a set of computed scores (UK Submission). */
export function scoreFieldsFor(scores: ClearTrustScores): Record<string, number | string> {
  const fields: Record<string, number | string> = { scoreHeadline: scores.headline, scoreBand: scores.band };
  for (const d of scores.dimensions) fields[SCORE_FIELD[d.key]] = d.score;
  return fields;
}

/**
 * Scores for display. Uses stored per-dimension scores where present (so old
 * reports show exactly what was sent), otherwise recomputes from the answers.
 */
export function scoresFromRow(row: AnswerRow & { scoreHeadline?: number | null; scoreBand?: string | null }): ClearTrustScores {
  const computed = computeScores(answersFromRow(row));
  if (row.scoreHeadline == null) return computed;
  const meta = bandMeta(row.scoreBand ?? computed.band);
  return {
    dimensions: computed.dimensions.map(d => ({
      ...d,
      score: (row[SCORE_FIELD[d.key as DimensionKey]] as number | null | undefined) ?? d.score,
    })),
    headline: row.scoreHeadline,
    band: meta.label,
    bandDisplayName: meta.displayName,
    bandColour: meta.colour,
  };
}

export function contentFromReport(r: GeneratedReport): GeneratedReportContent {
  return {
    cover: r.coverJson as unknown as GeneratedReportContent['cover'],
    scoreNarrative: r.scoreNarrativeJson as string,
    regulatoryMap: r.regulatoryMapJson as unknown as GeneratedReportContent['regulatoryMap'],
    shadowAi: r.shadowAiJson as string,
    opportunities: (r.opportunitiesJson ?? []) as unknown as GeneratedReportContent['opportunities'],
    exposures: (r.exposuresJson ?? []) as unknown as GeneratedReportContent['exposures'],
    upsell: r.upsellJson as string,
    quickWins: (r.quickWinsJson ?? undefined) as unknown as GeneratedReportContent['quickWins'],
    intakeNote: (r.intakeNoteJson ?? undefined) as unknown as string | undefined,
    plan90Day: (r.plan90DayJson ?? undefined) as unknown as GeneratedReportContent['plan90Day'],
  };
}

/** Report content → GeneratedReport columns. */
export function reportColumns(report: GeneratedReportContent): Omit<Prisma.GeneratedReportUncheckedCreateInput, 'submissionId'> {
  const json = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));
  return {
    coverJson: json(report.cover),
    scoreNarrativeJson: json(report.scoreNarrative),
    regulatoryMapJson: json(report.regulatoryMap),
    shadowAiJson: json(report.shadowAi),
    opportunitiesJson: json(report.opportunities),
    exposuresJson: json(report.exposures),
    upsellJson: json(report.upsell),
    quickWinsJson: json(report.quickWins),
    intakeNoteJson: json(report.intakeNote),
    plan90DayJson: json(report.plan90Day),
  };
}

/** Building-screen text for each real pipeline status (spec: honest stage text). */
export function stageText(status: string): string {
  switch (status) {
    case 'PENDING': return 'Saving your answers…';
    case 'SCORING': return 'Calculating your CLEAR TRUST score…';
    case 'RETRIEVING': return 'Selecting the guidance relevant to your firm…';
    case 'GENERATING': return 'Writing your personalised report…';
    case 'RENDERING_PDF':
    case 'SENDING_EMAIL': return 'Preparing your PDF and email…';
    case 'COMPLETE': return 'Done';
    case 'FAILED': return 'We hit a problem writing the full report';
    default: return 'Working on it…';
  }
}

/** Section labels for the regulatory map, by path. Global reuses the same four slots. */
export function regulatoryLabels(path: 'UK' | 'GLOBAL'): Record<keyof GeneratedReportContent['regulatoryMap'], string> {
  return path === 'UK'
    ? { sra: 'SRA expectations', ukGdpr: 'UK GDPR / ICO', pii: 'Professional indemnity insurance', clientProcurement: 'Client procurement pressure', euAiAct: 'EU AI Act (applicable)' }
    : { sra: 'Professional regulator', ukGdpr: 'Data protection and confidentiality', pii: 'Professional indemnity', clientProcurement: 'Client expectations', euAiAct: 'EU AI Act (applicable)' };
}
