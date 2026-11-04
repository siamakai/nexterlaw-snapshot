import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, findAdmin, notFoundMock, forbidden } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findAdmin: vi.fn(),
  notFoundMock: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  // Every prisma call other than the admin lookup must fail the test: a denied
  // request must never touch lead/KB data.
  forbidden: () => { throw new Error('data accessed without admin'); },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: () => authMock() }));
vi.mock('next/navigation', () => ({ notFound: () => notFoundMock() }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    adminUser: { findUnique: (...a: unknown[]) => findAdmin(...a) },
    submission: { findMany: forbidden },
    globalSubmission: { findMany: forbidden, findUnique: forbidden, update: forbidden },
    knowledgeBaseEntry: { findMany: forbidden, create: forbidden, update: forbidden, delete: forbidden },
  },
}));

import { checkAdmin, requireAdminApi, requireAdminPage } from '@/lib/security/admin-auth';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const jsonReq = (method: string) =>
  new Request('http://localhost/api/admin/x', {
    method,
    body: method === 'GET' ? undefined : '{}',
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  authMock.mockReset();
  findAdmin.mockReset();
});

describe('checkAdmin', () => {
  it('rejects signed-out requests with 401', async () => {
    authMock.mockResolvedValue({ userId: null });
    expect(await checkAdmin()).toEqual({ ok: false, status: 401 });
    expect(findAdmin).not.toHaveBeenCalled();
  });

  it('rejects signed-in users with no AdminUser row with 403', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' });
    findAdmin.mockResolvedValue(null);
    expect(await checkAdmin()).toEqual({ ok: false, status: 403 });
  });

  it('rejects inactive admins with 403', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' });
    findAdmin.mockResolvedValue({ id: 'a1', isActive: false });
    expect(await checkAdmin()).toEqual({ ok: false, status: 403 });
  });

  it('allows active admins', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' });
    findAdmin.mockResolvedValue({ id: 'a1', isActive: true });
    expect(await checkAdmin()).toEqual({ ok: true, adminId: 'a1', clerkUserId: 'user_1' });
    expect(await requireAdminApi()).toBeNull();
  });

  it('pages: non-admins get notFound', async () => {
    authMock.mockResolvedValue({ userId: 'user_1' });
    findAdmin.mockResolvedValue(null);
    await expect(requireAdminPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('admin API routes refuse non-admins and return no data', () => {
  const cases: Array<[string, () => Promise<Response>]> = [
    ['GET submissions CSV', async () => (await import('@/app/api/admin/submissions/csv/route')).GET()],
    ['GET global CSV', async () => (await import('@/app/api/admin/global-submissions/csv/route')).GET()],
    ['GET global submission', async () =>
      (await import('@/app/api/admin/global-submissions/[id]/route')).GET(jsonReq('GET'), ctx('x'))],
    ['PATCH global submission', async () =>
      (await import('@/app/api/admin/global-submissions/[id]/route')).PATCH(jsonReq('PATCH'), ctx('x'))],
    ['GET KB', async () => (await import('@/app/api/admin/kb/route')).GET()],
    ['POST KB', async () => (await import('@/app/api/admin/kb/route')).POST(jsonReq('POST'))],
    ['PATCH KB entry', async () => (await import('@/app/api/admin/kb/[id]/route')).PATCH(jsonReq('PATCH'), ctx('x'))],
    ['DELETE KB entry', async () => (await import('@/app/api/admin/kb/[id]/route')).DELETE(jsonReq('DELETE'), ctx('x'))],
  ];

  it.each(cases)('%s → 401 when signed out', async (_name, call) => {
    authMock.mockResolvedValue({ userId: null });
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorised' });
  });

  it.each(cases)('%s → 403 for a non-admin', async (_name, call) => {
    authMock.mockResolvedValue({ userId: 'user_2' });
    findAdmin.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });
});
