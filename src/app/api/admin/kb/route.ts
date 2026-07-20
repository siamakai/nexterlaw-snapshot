import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import type { FirmSizeBand } from '@prisma/client';

const KBSchema = z.object({
  category: z.enum(['REGULATORY_GUIDANCE', 'USE_CASE_LIBRARY', 'RISK_LIBRARY', 'CONDITIONAL_EU_LAYER', 'TOOL_CATEGORIES']),
  title: z.string().min(1).max(300),
  bodyText: z.string().min(1),
  appliedToPracticeTypes: z.array(z.string()).default([]),
  appliedToFirmSizes: z.array(z.enum(['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'])).default([]),
  sourceReference: z.string().max(500).optional().nullable(),
  weight: z.number().min(0).max(10).default(1.0),
  isActive: z.boolean().default(true),
  isEuLayerEntry: z.boolean().default(false),
  vertical: z.enum(['LAW', 'ACCOUNTANCY']).default('LAW'),
});

export async function GET() {
  const entries = await prisma.knowledgeBaseEntry.findMany({
    orderBy: [{ category: 'asc' }, { weight: 'desc' }],
    take: 500,
  });

  return Response.json(entries);
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = KBSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });

  const d = parsed.data;
  const entry = await prisma.knowledgeBaseEntry.create({
    data: {
      category: d.category,
      title: d.title,
      bodyText: d.bodyText,
      appliedToPracticeTypes: d.appliedToPracticeTypes,
      appliedToFirmSizes: d.appliedToFirmSizes as FirmSizeBand[],
      sourceReference: d.sourceReference ?? null,
      weight: d.weight,
      isActive: d.isActive,
      isEuLayerEntry: d.isEuLayerEntry,
      vertical: d.vertical,
      lastReviewedDate: new Date(),
      createdBy: 'admin',
    },
  });

  return Response.json(entry, { status: 201 });
}
