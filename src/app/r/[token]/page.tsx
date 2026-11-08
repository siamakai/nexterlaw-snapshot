import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { loadResultByToken } from '@/lib/results';
import { benchmarkFor } from '@/lib/benchmark';
import { isResultToken } from '@/lib/security/tokens';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { ResultsView, type ResultDto } from '@/components/snapshot/ResultsView';
import { nextBandHint } from '@/lib/scoring';
import { SITE } from '@/config/site';

// Private, shareable results page. Anyone with the link can view it, so it is
// never indexed and the token is never shown in analytics.
export const metadata: Metadata = {
  title: 'Your AI Readiness Snapshot — NexterLaw',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function ResultsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isResultToken(token)) notFound();

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  const limit = await checkRateLimit('resultPage', ip);
  if (!limit.allowed) {
    return <p style={{ color: '#ede8e0', padding: 32 }}>Too many requests. Please wait a minute and refresh.</p>;
  }

  const view = await loadResultByToken(token);
  if (!view) notFound();

  const benchmark =
    view.path === 'UK' && view.status === 'COMPLETE' && view.firmSize && view.scores && !view.isTest
      ? await benchmarkFor(view.firmSize, view.scores.headline)
      : null;

  const dto: ResultDto = {
    path: view.path,
    token: view.token,
    firmName: view.firmName,
    country: view.country,
    status: view.status,
    createdAt: view.createdAt.toISOString(),
    dueAt: view.dueAt?.toISOString() ?? null,
    scores: view.scores,
    hint: view.scores ? nextBandHint(view.scores) : null,
    report: view.report,
    pdfUrl: view.pdfUrl,
    nextStep: view.nextStep,
    intakeRating: view.intakeRating,
    retakeReminderSet: view.retakeReminderSet,
    planLinks: view.planLinks,
    benchmark,
    timeoutSeconds: SITE.reportTimeoutSeconds,
    globalWaitlist: SITE.global.waitlist,
  };

  return <ResultsView data={dto} />;
}
