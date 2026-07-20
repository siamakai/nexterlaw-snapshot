import type { NextRequest } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/db/prisma';
import { ReportPdf } from '@/lib/pdf-template';
import type { GeneratedReportContent, ClearTrustScores, DimensionScore } from '@/types';
import type { Submission, GeneratedReport } from '@prisma/client';

const BAND_META: Record<string, { displayName: string; colour: string }> = {
  EXPOSED: { displayName: 'Exposed', colour: '#ef4444' },
  DEVELOPING: { displayName: 'Developing', colour: '#f59e0b' },
  IN_CONTROL: { displayName: 'In Control', colour: '#22c55e' },
};

type Row = Submission & { report: GeneratedReport | null };

function buildScores(s: Row): ClearTrustScores {
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

function buildContent(r: GeneratedReport): GeneratedReportContent {
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

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/report/[id]/pdf'>) {
  const { id } = await ctx.params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { report: true },
  });

  if (!submission || submission.status !== 'COMPLETE' || !submission.report) {
    return Response.json({ error: 'Report not ready' }, { status: 404 });
  }

  const scores = buildScores(submission);
  const content = buildContent(submission.report);

  const element = React.createElement(
    ReportPdf,
    { content, scores },
  ) as unknown as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(element);

  const filename = `nexterlaw-ai-readiness-${submission.id}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
