import { prisma } from './db/prisma';
import { SITE } from '@/config/site';
import type { FirmSizeBand } from '@prisma/client';

export interface Benchmark {
  sample: number;
  average: number;
  /** Share of similar firms this score is at or above (0–100). */
  percentile: number;
}

/**
 * "Compare with similar firms" (spec §2 item 12). Returns null until at least
 * SITE.benchmarkMinSample completed, non-test reports exist in that size band,
 * so the block stays hidden instead of showing thin data.
 */
export async function benchmarkFor(firmSize: FirmSizeBand, score: number): Promise<Benchmark | null> {
  const rows = await prisma.submission.findMany({
    where: { firmSize, status: 'COMPLETE', isTest: false, scoreHeadline: { not: null } },
    select: { scoreHeadline: true },
  });
  if (rows.length < SITE.benchmarkMinSample) return null;
  const values = rows.map(r => r.scoreHeadline as number);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const percentile = Math.round((values.filter(v => v <= score).length / values.length) * 100);
  return { sample: values.length, average, percentile };
}
