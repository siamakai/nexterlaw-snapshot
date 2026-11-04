import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runPipeline } = vi.hoisted(() => ({ runPipeline: vi.fn() }));
vi.mock('@/lib/pipeline', () => ({ runGenerationPipeline: (id: string) => runPipeline(id) }));

beforeEach(() => vi.clearAllMocks());

describe('Netlify background function', () => {
  const call = async (headers: Record<string, string>) => {
    const { handler } = await import('../netlify/functions/generate-report-background');
    return handler(
      { httpMethod: 'POST', headers, body: JSON.stringify({ submissionId: 'sub1' }) } as never,
      {} as never,
    ) as Promise<{ statusCode: number }>;
  };

  it('refuses every call when no secret is configured (fail closed)', async () => {
    process.env.BACKGROUND_FUNCTION_SECRET = '';
    expect((await call({ 'x-background-secret': '' })).statusCode).toBe(401);
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it('refuses a wrong secret', async () => {
    process.env.BACKGROUND_FUNCTION_SECRET = 'a'.repeat(40);
    expect((await call({ 'x-background-secret': 'b'.repeat(40) })).statusCode).toBe(401);
    expect((await call({})).statusCode).toBe(401);
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it('runs the pipeline with the right secret', async () => {
    process.env.BACKGROUND_FUNCTION_SECRET = 'a'.repeat(40);
    expect((await call({ 'x-background-secret': 'a'.repeat(40) })).statusCode).toBe(200);
    expect(runPipeline).toHaveBeenCalledWith('sub1');
    process.env.BACKGROUND_FUNCTION_SECRET = '';
  });
});
