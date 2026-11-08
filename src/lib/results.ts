// Loads everything the results page, PDF and "email me" need for one token.
// A token can belong to a UK Submission or a Global submission.

import { prisma } from './db/prisma';
import { contentFromReport, scoresFromRow } from './report-data';
import { pdfPathFor } from './security/report-access';
import { resolveNextStep, type ResolvedNextStep, type RouteId } from '@/config/next-steps';
import { resourceById, resourceHref } from '@/config/resources';
import type { ClearTrustScores, GeneratedReportContent } from '@/types';
import type { FirmSizeBand } from '@prisma/client';
import type { IntakeRating } from './intake';
import { SITE } from '@/config/site';

export type ResultPath = 'UK' | 'GLOBAL';

export interface ResultView {
  path: ResultPath;
  token: string;
  firmName: string;
  email: string;
  contactName: string | null;
  country: string;
  status: 'BUILDING' | 'COMPLETE' | 'FAILED' | 'AWAITING_REVIEW';
  createdAt: Date;
  dueAt: Date | null;
  scores: ClearTrustScores | null;
  report: GeneratedReportContent | null;
  pdfUrl: string | null;
  nextStep: ResolvedNextStep;
  intakeRating: IntakeRating | null;
  firmSize: FirmSizeBand | null;
  marketingConsent: boolean;
  isTest: boolean;
  retakeReminderSet: boolean;
  /** 90-day plan resources resolved to links (server-side env). */
  planLinks: Record<string, { title: string; href: string; type: string }>;
}

function planLinks(report: GeneratedReportContent | null): ResultView['planLinks'] {
  const out: ResultView['planLinks'] = {};
  for (const step of report?.plan90Day ?? []) {
    const r = resourceById(step.resourceId);
    if (r) out[r.id] = { title: r.title, href: resourceHref(r), type: r.type };
  }
  return out;
}

export async function loadResultByToken(token: string): Promise<ResultView | null> {
  const uk = await prisma.submission.findUnique({ where: { resultToken: token }, include: { report: true, lead: true } });
  if (uk) {
    const report = uk.report ? contentFromReport(uk.report) : null;
    const status: ResultView['status'] = uk.status === 'COMPLETE' ? 'COMPLETE' : uk.status === 'FAILED' ? 'FAILED' : 'BUILDING';
    return {
      path: 'UK',
      token,
      firmName: uk.lead.firmName,
      email: uk.lead.workEmail,
      contactName: null,
      country: uk.lead.country,
      status,
      createdAt: uk.createdAt,
      dueAt: null,
      scores: uk.scoreHeadline != null ? scoresFromRow(uk) : null,
      report,
      pdfUrl: status === 'COMPLETE' ? pdfPathFor(uk) : null,
      nextStep: resolveNextStep((uk.route as RouteId | null) ?? 'SNAPSHOT_REVIEW'),
      intakeRating: (uk.intakeRating as IntakeRating | null) ?? null,
      firmSize: uk.firmSize,
      marketingConsent: uk.lead.marketingConsent,
      isTest: uk.isTest,
      retakeReminderSet: !!uk.retakeReminderAt,
      planLinks: planLinks(report),
    };
  }

  const g = await prisma.globalSubmission.findUnique({ where: { resultToken: token } });
  if (!g) return null;
  // Only the human-approved report is ever shown to the firm, never the AI draft.
  const report = g.approvedAt && g.reportFinalJson ? (g.reportFinalJson as unknown as GeneratedReportContent) : null;
  const scores = SITE.global.showScore || report ? scoresFromRow(g) : null;
  return {
    path: 'GLOBAL',
    token,
    firmName: g.firmName,
    email: g.workEmail,
    contactName: g.contactName,
    country: g.country,
    status: report ? 'COMPLETE' : 'AWAITING_REVIEW',
    createdAt: g.createdAt,
    dueAt: g.dueAt,
    scores,
    report,
    pdfUrl: report ? `/api/report/${token}/pdf` : null,
    nextStep: resolveNextStep('GLOBAL'),
    intakeRating: (g.intakeRating as IntakeRating | null) ?? null,
    firmSize: null,
    marketingConsent: g.marketingConsent,
    isTest: g.isTest,
    retakeReminderSet: false,
    planLinks: planLinks(report),
  };
}
