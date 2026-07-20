import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type {
  ReportStatusResponse,
  GeneratedReportContent,
  ClearTrustScores,
  DimensionScore,
} from '@/types';
import type { Submission, GeneratedReport } from '@prisma/client';

const BAND_META: Record<string, { displayName: string; colour: string }> = {
  EXPOSED: { displayName: 'Exposed', colour: '#ef4444' },
  DEVELOPING: { displayName: 'Developing', colour: '#f59e0b' },
  IN_CONTROL: { displayName: 'In Control', colour: '#22c55e' },
};

type SubmissionWithReport = Submission & { report: GeneratedReport | null };

function rebuildScores(s: SubmissionWithReport): ClearTrustScores {
  const bandMeta = BAND_META[s.scoreBand ?? 'EXPOSED'] ?? BAND_META['EXPOSED'];

  const dimensions: DimensionScore[] = [
    { key: 'compliance',      letter: 'C', name: 'Compliance',       score: s.scoreCompliance      ?? 0, answer: s.answerCompliance },
    { key: 'literacy',        letter: 'L', name: 'Literacy',         score: s.scoreLiteracy        ?? 0, answer: s.answerLiteracy },
    { key: 'explainability',  letter: 'E', name: 'Explainability',   score: s.scoreExplainability  ?? 0, answer: s.answerExplainability },
    { key: 'accountability',  letter: 'A', name: 'Accountability',   score: s.scoreAccountability  ?? 0, answer: s.answerAccountability },
    { key: 'rights',          letter: 'R', name: 'Rights',           score: s.scoreRights          ?? 0, answer: s.answerRights },
    { key: 'transparency',    letter: 'T', name: 'Transparency',     score: s.scoreTransparency    ?? 0, answer: s.answerTransparency },
    { key: 'reliability',     letter: 'R', name: 'Reliability',      score: s.scoreReliability     ?? 0, answer: s.answerReliability },
    { key: 'usageGovernance', letter: 'U', name: 'Usage Governance', score: s.scoreUsageGovernance ?? 0, answer: s.answerUsageGovernance },
    { key: 'security',        letter: 'S', name: 'Security',         score: s.scoreSecurity        ?? 0, answer: s.answerSecurity },
    { key: 'traceability',    letter: 'T', name: 'Traceability',     score: s.scoreTraceability    ?? 0, answer: s.answerTraceability },
  ];

  return {
    dimensions,
    headline: s.scoreHeadline ?? 0,
    band: (s.scoreBand ?? 'EXPOSED') as ClearTrustScores['band'],
    bandDisplayName: bandMeta.displayName,
    bandColour: bandMeta.colour,
  };
}

function rebuildReport(r: GeneratedReport): GeneratedReportContent {
  return {
    cover: r.coverJson as unknown as GeneratedReportContent['cover'],
    scoreNarrative: r.scoreNarrativeJson as string,
    regulatoryMap: r.regulatoryMapJson as unknown as GeneratedReportContent['regulatoryMap'],
    shadowAi: r.shadowAiJson as string,
    opportunities: r.opportunitiesJson as unknown as GeneratedReportContent['opportunities'],
    exposures: r.exposuresJson as unknown as GeneratedReportContent['exposures'],
    upsell: r.upsellJson as string,
  };
}

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/report/[id]'>) {
  const { id } = await ctx.params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { report: true },
  });

  if (!submission) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const response: ReportStatusResponse = {
    status: submission.status,
    ...(submission.failureReason ? { error: submission.failureReason } : {}),
  };

  if (submission.status === 'COMPLETE' && submission.report) {
    response.scores = rebuildScores(submission);
    response.report = rebuildReport(submission.report);
    if (submission.pdfUrl) response.pdfUrl = submission.pdfUrl;
  }

  return Response.json(response);
}
