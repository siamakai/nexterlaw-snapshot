import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { pdfPathFor, resolveReportRef } from '@/lib/security/report-access';
import { contentFromReport, scoresFromRow, stageText } from '@/lib/report-data';
import type { ReportStatusResponse } from '@/types';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/report/[id]'>) {
  // [id] is the result token (new links) or the raw submission id (old emails).
  const { id: ref } = await ctx.params;

  const access = await resolveReportRef(req, ref, 'status');
  if (!access.ok) return access.response;

  const submission = await prisma.submission.findUnique({
    where: access.where,
    include: { report: true },
  });

  if (!submission) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Never send internal error text to the browser; it stays in failureReason.
  const response: ReportStatusResponse = {
    status: submission.status,
    stage: stageText(submission.status),
    elapsedSeconds: Math.round((Date.now() - submission.createdAt.getTime()) / 1000),
    ...(submission.status === 'FAILED' ? { error: 'Report generation failed.' } : {}),
  };

  // The score is calculated without AI, so it is available as soon as scoring
  // has run, even if the written report is slow or fails.
  if (submission.scoreHeadline != null) {
    response.scores = scoresFromRow(submission);
  }

  if (submission.status === 'COMPLETE' && submission.report) {
    response.report = contentFromReport(submission.report);
    response.pdfUrl = pdfPathFor(submission);
  }

  return Response.json(response);
}
