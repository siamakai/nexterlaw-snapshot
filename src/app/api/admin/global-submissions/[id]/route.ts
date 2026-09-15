import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const PatchSchema = z.object({
  status: z.enum(['PENDING', 'RESEARCHING', 'REPORT_READY', 'SENT']).optional(),
  internalNotes: z.string().max(5000).nullable().optional(),
});

export async function GET(_req: Request, ctx: RouteContext<'/api/admin/global-submissions/[id]'>) {
  const { id } = await ctx.params;

  const submission = await prisma.globalSubmission.findUnique({ where: { id } });
  if (!submission) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(submission);
}

export async function PATCH(request: Request, ctx: RouteContext<'/api/admin/global-submissions/[id]'>) {
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });

  const d = parsed.data;
  const updateData: Parameters<typeof prisma.globalSubmission.update>[0]['data'] = {};

  if (d.status !== undefined) {
    updateData.status = d.status;
    if (d.status === 'REPORT_READY') updateData.reportPreparedAt = new Date();
    if (d.status === 'SENT') updateData.reportSentAt = new Date();
  }
  if (d.internalNotes !== undefined) updateData.internalNotes = d.internalNotes;

  try {
    const submission = await prisma.globalSubmission.update({ where: { id }, data: updateData });
    return Response.json(submission);
  } catch {
    return Response.json({ error: 'Submission not found' }, { status: 404 });
  }
}
