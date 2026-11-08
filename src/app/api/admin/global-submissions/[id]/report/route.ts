import { after } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { checkAdmin } from '@/lib/security/admin-auth';
import { prisma } from '@/lib/db/prisma';
import { generateGlobalDraft } from '@/lib/global-draft';
import { sendGlobalReportReady } from '@/lib/email';
import { resultsUrl } from '@/lib/urls';
import { resolveNextStep } from '@/config/next-steps';
import { syncToCrm } from '@/lib/crm/ghl';
import { generateResultToken } from '@/lib/security/tokens';

// POST /api/admin/global-submissions/{id}/report  (admin only)
//   { action: "draft" }                 → (re)generate the AI first draft
//   { action: "save", content }         → save the reviewer's edits (not sent)
//   { action: "approve", content }      → save, approve and send the report link to the firm
// Nothing reaches the firm without "approve".

const text = z.string().max(20000);
const ContentSchema = z.object({
  cover: z.object({ firmName: text, date: text, disclaimer: text }),
  scoreNarrative: text,
  regulatoryMap: z.object({ sra: text, ukGdpr: text, pii: text, clientProcurement: text, euAiAct: text.optional() }),
  shadowAi: text,
  opportunities: z.array(z.object({ title: text, benefit: text, toolCategory: text })).max(8),
  exposures: z.array(z.object({ title: text, description: text, severity: z.enum(['HIGH', 'MEDIUM', 'LOW']) })).max(8),
  upsell: text,
  quickWins: z.array(z.object({ title: text, action: text, dimension: z.string().max(40) })).max(5).optional(),
  intakeNote: text.optional(),
  plan90Day: z.array(z.object({ window: text, title: text, action: text, resourceId: z.string().max(80) })).max(5).optional(),
});

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('draft') }),
  z.object({ action: z.literal('save'), content: ContentSchema }),
  z.object({ action: z.literal('approve'), content: ContentSchema }),
]);

export async function POST(request: Request, ctx: RouteContext<'/api/admin/global-submissions/[id]/report'>) {
  const admin = await checkAdmin();
  if (!admin.ok) {
    return Response.json({ error: admin.status === 401 ? 'Unauthorised' : 'Forbidden' }, { status: admin.status });
  }

  const { id } = await ctx.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });

  const s = await prisma.globalSubmission.findUnique({ where: { id } });
  if (!s) return Response.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.action === 'draft') {
    after(async () => {
      try {
        const draft = await generateGlobalDraft(s);
        await prisma.globalSubmission.update({
          where: { id },
          data: { reportDraftJson: draft as unknown as Prisma.InputJsonValue, reportDraftAt: new Date(), status: s.status === 'PENDING' ? 'RESEARCHING' : s.status },
        });
      } catch (err) {
        console.error('[admin/global/draft] failed:', err);
      }
    });
    return Response.json({ ok: true, message: 'Draft requested. Refresh in about a minute.' });
  }

  const content = parsed.data.content as unknown as Prisma.InputJsonValue;

  if (parsed.data.action === 'save') {
    const updated = await prisma.globalSubmission.update({
      where: { id },
      data: { reportFinalJson: content, status: s.status === 'SENT' ? 'SENT' : 'REPORT_READY', reportPreparedAt: new Date() },
    });
    return Response.json({ ok: true, status: updated.status });
  }

  // approve → deliver
  const token = s.resultToken ?? generateResultToken();
  const now = new Date();
  await prisma.globalSubmission.update({
    where: { id },
    data: {
      resultToken: token,
      reportFinalJson: content,
      approvedBy: admin.adminId,
      approvedAt: now,
      reportPreparedAt: s.reportPreparedAt ?? now,
      reportSentAt: now,
      status: 'SENT',
    },
  });

  const link = resultsUrl(token);
  let emailed = true;
  try {
    await sendGlobalReportReady({
      to: s.workEmail, contactName: s.contactName, firmName: s.firmName, resultsUrl: link, nextStep: resolveNextStep('GLOBAL'),
    });
  } catch (err) {
    emailed = false;
    console.error('[admin/global/approve] email failed:', err);
  }

  await syncToCrm({
    event: 'global_report_sent', email: s.workEmail, firmName: s.firmName, contactName: s.contactName,
    country: s.country, path: 'global', band: s.scoreBand, score: s.scoreHeadline, route: 'GLOBAL',
    resultsUrl: link, marketingConsent: s.marketingConsent, isTest: s.isTest,
  }).catch(err => console.error('[admin/global/approve] CRM sync failed:', err));

  return Response.json({ ok: true, status: 'SENT', resultsUrl: link, emailed });
}
