/**
 * One-off cleanup: removes the 3 Clio Legal Trends Report 2026 knowledge-base
 * entries from the live database. These were removed from src/lib/knowledge-base-seed.ts,
 * but prisma/seed.ts only ever creates missing entries — it never deletes rows that
 * are no longer in the seed array. Run this once against the deployed DATABASE_URL.
 *
 * Usage: tsx --tsconfig tsconfig.json scripts/remove-clio-kb-entries.ts
 *
 * Safe to run more than once — matches by sourceReference and deletes 0 rows
 * if already cleaned up. Does NOT touch the two legitimate "Clio" product
 * mentions in TOOL_CATEGORIES entries (those reference Clio the practice
 * management software, not the Legal Trends Report, and have no sourceReference
 * containing "Clio Legal Trends").
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const matches = await prisma.knowledgeBaseEntry.findMany({
    where: { sourceReference: { contains: 'Clio Legal Trends' } },
    select: { id: true, title: true, category: true, sourceReference: true },
  });

  if (matches.length === 0) {
    console.log('No Clio Legal Trends Report entries found — nothing to remove.');
    return;
  }

  console.log(`Found ${matches.length} entries to remove:`);
  matches.forEach(m => console.log(`  - [${m.category}] ${m.title}`));

  const { count } = await prisma.knowledgeBaseEntry.deleteMany({
    where: { sourceReference: { contains: 'Clio Legal Trends' } },
  });

  console.log(`Deleted ${count} entries.`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
