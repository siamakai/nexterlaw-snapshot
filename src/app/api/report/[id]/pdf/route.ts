import type { NextRequest } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/db/prisma';
import { resolveReportRef } from '@/lib/security/report-access';
import { ReportPdf } from '@/lib/pdf-template';
import { loadResultByToken, type ResultView } from '@/lib/results';
import { contentFromReport, scoresFromRow } from '@/lib/report-data';
import { resolveNextStep, type RouteId } from '@/config/next-steps';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/report/[id]/pdf'>) {
  // [id] is the result token (new links, UK or Global) or the raw submission id (old emails).
  const { id: ref } = await ctx.params;

  const access = await resolveReportRef(req, ref, 'pdf');
  if (!access.ok) return access.response;

  let view: Pick<ResultView, 'path' | 'firmName' | 'scores' | 'report' | 'nextStep' | 'planLinks'> | null = null;

  if (access.legacy) {
    // Links in emails sent before v2: UK only, looked up by id.
    const s = await prisma.submission.findUnique({ where: access.where, include: { report: true } });
    if (s?.status === 'COMPLETE' && s.report) {
      view = {
        path: 'UK',
        firmName: s.id,
        scores: scoresFromRow(s),
        report: contentFromReport(s.report),
        nextStep: resolveNextStep((s.route as RouteId | null) ?? 'SNAPSHOT_REVIEW'),
        planLinks: {},
      };
    }
  } else {
    const r = await loadResultByToken(ref);
    if (r && r.status === 'COMPLETE') view = r;
  }

  if (!view?.report || !view.scores) {
    return Response.json({ error: 'Report not ready' }, { status: 404 });
  }

  const element = React.createElement(ReportPdf, {
    content: view.report,
    scores: view.scores,
    nextStep: view.nextStep,
    planLinks: view.planLinks,
    path: view.path,
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(element);
  const safeName = (view.report.cover?.firmName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nexterlaw-ai-readiness-${safeName}.pdf"`,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
