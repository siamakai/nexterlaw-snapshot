import { prisma } from './db/prisma';
import type { FirmSizeBand } from '@/types';
import type { KnowledgeBaseCategory } from '@prisma/client';

interface RetrievalOptions {
  practiceTypes: string[];
  firmSize: FirmSizeBand;
  includeEuLayer: boolean;
  vertical?: 'LAW' | 'ACCOUNTANCY';
}

interface KBResult {
  id: string;
  category: KnowledgeBaseCategory;
  title: string;
  bodyText: string;
  weight: number;
  sourceReference: string | null;
}

export async function retrieveKnowledgeBaseEntries(opts: RetrievalOptions): Promise<{
  regulatory: KBResult[];
  useCases: KBResult[];
  risks: KBResult[];
  euLayer: KBResult[];
  toolCategories: KBResult[];
}> {
  const vertical = opts.vertical ?? 'LAW';

  const baseWhere = {
    isActive: true,
    vertical,
    AND: [
      {
        OR: [
          { appliedToPracticeTypes: { isEmpty: true } },
          { appliedToPracticeTypes: { hasSome: opts.practiceTypes } },
        ],
      },
      {
        OR: [
          { appliedToFirmSizes: { isEmpty: true } },
          { appliedToFirmSizes: { has: opts.firmSize } },
        ],
      },
    ],
  };

  const [regulatory, useCases, risks, euLayer, toolCategories] = await Promise.all([
    prisma.knowledgeBaseEntry.findMany({
      where: { ...baseWhere, category: 'REGULATORY_GUIDANCE', isEuLayerEntry: false },
      orderBy: { weight: 'desc' },
      take: 8,
    }),
    prisma.knowledgeBaseEntry.findMany({
      where: { ...baseWhere, category: 'USE_CASE_LIBRARY' },
      orderBy: { weight: 'desc' },
      take: 5,
    }),
    prisma.knowledgeBaseEntry.findMany({
      where: { ...baseWhere, category: 'RISK_LIBRARY' },
      orderBy: { weight: 'desc' },
      take: 6,
    }),
    opts.includeEuLayer
      ? prisma.knowledgeBaseEntry.findMany({
          where: { ...baseWhere, isEuLayerEntry: true },
          orderBy: { weight: 'desc' },
          take: 3,
        })
      : Promise.resolve([]),
    prisma.knowledgeBaseEntry.findMany({
      where: { ...baseWhere, category: 'TOOL_CATEGORIES' },
      orderBy: { weight: 'desc' },
      take: 4,
    }),
  ]);

  return {
    regulatory: regulatory as KBResult[],
    useCases: useCases as KBResult[],
    risks: risks as KBResult[],
    euLayer: euLayer as KBResult[],
    toolCategories: toolCategories as KBResult[],
  };
}

export function formatEntriesForPrompt(entries: KBResult[]): string {
  return entries
    .map((e, i) => `[${i + 1}] ${e.title}\n${e.bodyText}${e.sourceReference ? `\nSource: ${e.sourceReference}` : ''}`)
    .join('\n\n---\n\n');
}
