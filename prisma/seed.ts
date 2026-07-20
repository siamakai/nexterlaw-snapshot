import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { KNOWLEDGE_BASE_ENTRIES } from '../src/lib/knowledge-base-seed';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Seeding ${KNOWLEDGE_BASE_ENTRIES.length} knowledge base entries…`);

  let created = 0;
  let skipped = 0;

  for (const entry of KNOWLEDGE_BASE_ENTRIES) {
    const existing = await prisma.knowledgeBaseEntry.findFirst({
      where: { title: entry.title, category: entry.category },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.knowledgeBaseEntry.create({
      data: {
        category: entry.category,
        title: entry.title,
        bodyText: entry.bodyText,
        appliedToPracticeTypes: entry.appliedToPracticeTypes,
        appliedToFirmSizes: entry.appliedToFirmSizes as any[],
        sourceReference: entry.sourceReference ?? null,
        weight: entry.weight,
        isActive: true,
        isEuLayerEntry: entry.isEuLayerEntry ?? false,
        lastReviewedDate: new Date(),
        vertical: 'LAW',
        createdBy: 'seed',
      },
    });
    created++;
  }

  console.log(`Done. Created: ${created}, Skipped (already exist): ${skipped}.`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
