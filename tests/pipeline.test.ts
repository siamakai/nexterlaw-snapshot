import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  submission: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
};
vi.mock('@/lib/db/prisma', () => ({ prisma: db }));
const generateReport = vi.fn();
vi.mock('@/lib/report-generator', () => ({ generateReport: (...a: unknown[]) => generateReport(...a) }));
vi.mock('@/lib/knowledge-retrieval', () => ({ retrieveKnowledgeBaseEntries: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendDay0Email: vi.fn() }));
vi.mock('@/lib/google-sheets', () => ({ appendUsageRow: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('runGenerationPipeline idempotency', () => {
  it('skips a submission that is not PENDING: no AI call, no status change', async () => {
    db.submission.updateMany.mockResolvedValue({ count: 0 });
    const { runGenerationPipeline } = await import('@/lib/pipeline');
    await runGenerationPipeline('sub1');
    expect(db.submission.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub1', status: 'PENDING' },
      data: { status: 'SCORING' },
    });
    expect(db.submission.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(db.submission.update).not.toHaveBeenCalled();
    expect(generateReport).not.toHaveBeenCalled();
  });
});

