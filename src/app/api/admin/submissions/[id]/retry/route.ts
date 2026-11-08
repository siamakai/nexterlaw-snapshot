import { after } from 'next/server';
import { requireAdminApi } from '@/lib/security/admin-auth';
import { prisma } from '@/lib/db/prisma';
import { runGenerationPipeline } from '@/lib/pipeline';

// POST /api/admin/submissions/{id}/retry — re-run a FAILED report (admin only).
// The firm was promised the report by email; this delivers it once the cause is fixed.
export async function POST(_req: Request, ctx: RouteContext<'/api/admin/submissions/[id]/retry'>) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await ctx.params;
  const reset = await prisma.submission.updateMany({
    where: { id, status: 'FAILED' },
    data: { status: 'PENDING', failureReason: null, retryCount: { increment: 1 } },
  });
  if (reset.count === 0) {
    return Response.json({ error: 'Only failed submissions can be retried.' }, { status: 409 });
  }
  // A failed run may have left a partial report row; remove it so the new one can be saved.
  await prisma.generatedReport.deleteMany({ where: { submissionId: id } });

  after(async () => {
    await runGenerationPipeline(id).catch(err => console.error('[admin/retry] pipeline failed:', err));
  });
  return Response.json({ ok: true, status: 'PENDING' });
}
