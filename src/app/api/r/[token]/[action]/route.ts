import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimits, getClientIp, tooManyRequests } from '@/lib/security/rate-limit';
import { isResultToken } from '@/lib/security/tokens';
import { loadResultByToken } from '@/lib/results';
import { sendDay0Email, sendGlobalReportReady } from '@/lib/email';
import { resultsUrl } from '@/lib/urls';
import { syncToCrm } from '@/lib/crm/ghl';

// POST /api/r/{token}/click     — records the first next-step click (main or secondary)
// POST /api/r/{token}/email     — re-sends the report to the address it was requested for
// POST /api/r/{token}/reminder  — "Remind me to retake in 3 months" (UK; via CRM, consent only)
//
// "email" only ever sends to the email on file, never to an address in the request,
// so the endpoint can't be used to send mail to strangers.

export async function POST(req: NextRequest, ctx: RouteContext<'/api/r/[token]/[action]'>) {
  const { token, action } = await ctx.params;
  if (!isResultToken(token) || !['click', 'email', 'reminder'].includes(action)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const limit = await checkRateLimits([['resultAction', `${token}:${action}:${getClientIp(req)}`]]);
  if (!limit.allowed) return tooManyRequests(limit);

  const view = await loadResultByToken(token);
  if (!view) return Response.json({ error: 'Not found' }, { status: 404 });

  if (action === 'click') {
    const data = { nextStepClickedAt: new Date() };
    if (view.path === 'UK') {
      await prisma.submission.updateMany({ where: { resultToken: token, nextStepClickedAt: null }, data });
    } else {
      await prisma.globalSubmission.updateMany({ where: { resultToken: token, nextStepClickedAt: null }, data });
    }
    return Response.json({ ok: true });
  }

  if (action === 'email') {
    if (view.status !== 'COMPLETE' || !view.scores || !view.pdfUrl) {
      return Response.json({ error: 'Your report isn’t ready yet.' }, { status: 409 });
    }
    try {
      if (view.path === 'UK') {
        await sendDay0Email({
          to: view.email, firmName: view.firmName, scores: view.scores, pdfUrl: view.pdfUrl,
          resultsUrl: resultsUrl(token), nextStep: view.nextStep,
        });
      } else {
        await sendGlobalReportReady({
          to: view.email, contactName: view.contactName ?? view.firmName, firmName: view.firmName,
          resultsUrl: resultsUrl(token), nextStep: view.nextStep,
        });
      }
    } catch (err) {
      console.error('[r/email] send failed:', err);
      return Response.json({ error: 'We couldn’t send the email just now. Please try again later.' }, { status: 502 });
    }
    // Only a masked address goes back to the browser.
    const [user, domain] = view.email.split('@');
    return Response.json({ ok: true, sentTo: `${user.slice(0, 2)}…@${domain}` });
  }

  // reminder
  if (view.path !== 'UK') return Response.json({ error: 'Not available' }, { status: 404 });
  await prisma.submission.update({ where: { resultToken: token }, data: { retakeReminderAt: new Date() } });
  await syncToCrm({
    event: 'retake_reminder_requested',
    email: view.email,
    firmName: view.firmName,
    path: 'uk',
    band: view.scores?.band,
    score: view.scores?.headline,
    resultsUrl: resultsUrl(token),
    marketingConsent: view.marketingConsent,
    isTest: view.isTest,
  }).catch(err => console.error('[r/reminder] CRM sync failed:', err));
  return Response.json({ ok: true });
}
