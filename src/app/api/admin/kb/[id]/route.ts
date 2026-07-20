import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import type { FirmSizeBand } from '@prisma/client';

const PatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  bodyText: z.string().min(1).optional(),
  category: z.enum(['REGULATORY_GUIDANCE', 'USE_CASE_LIBRARY', 'RISK_LIBRARY', 'CONDITIONAL_EU_LAYER', 'TOOL_CATEGORIES']).optional(),
  weight: z.number().min(0).max(10).optional(),
  isActive: z.boolean().optional(),
  isEuLayerEntry: z.boolean().optional(),
  sourceReference: z.string().max(500).nullable().optional(),
  appliedToPracticeTypes: z.array(z.string()).optional(),
  appliedToFirmSizes: z.array(z.enum(['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'])).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<'/api/admin/kb/[id]'>) {
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });

  const d = parsed.data;

  // Build update payload explicitly to satisfy Prisma's strict enum array types
  const updateData: Parameters<typeof prisma.knowledgeBaseEntry.update>[0]['data'] = {
    lastReviewedDate: new Date(),
    updatedBy: 'admin',
  };
  if (d.title !== undefined) updateData.title = d.title;
  if (d.bodyText !== undefined) updateData.bodyText = d.bodyText;
  if (d.category !== undefined) updateData.category = d.category;
  if (d.weight !== undefined) updateData.weight = d.weight;
  if (d.isActive !== undefined) updateData.isActive = d.isActive;
  if (d.isEuLayerEntry !== undefined) updateData.isEuLayerEntry = d.isEuLayerEntry;
  if (d.sourceReference !== undefined) updateData.sourceReference = d.sourceReference;
  if (d.appliedToPracticeTypes !== undefined) updateData.appliedToPracticeTypes = d.appliedToPracticeTypes;
  if (d.appliedToFirmSizes !== undefined) updateData.appliedToFirmSizes = d.appliedToFirmSizes as FirmSizeBand[];

  try {
    const entry = await prisma.knowledgeBaseEntry.update({
      where: { id },
      data: updateData,
    });
    return Response.json(entry);
  } catch {
    return Response.json({ error: 'Entry not found' }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/admin/kb/[id]'>) {
  const { id } = await ctx.params;

  try {
    await prisma.knowledgeBaseEntry.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: 'Entry not found' }, { status: 404 });
  }
}
