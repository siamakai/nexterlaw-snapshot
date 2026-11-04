import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';

/**
 * Admin access = signed in with Clerk AND an active AdminUser row for that
 * Clerk user id. Both checks run on every admin request: the proxy only
 * confirms a session exists; this confirms the person is an allowed admin.
 */
export type AdminCheck =
  | { ok: true; adminId: string; clerkUserId: string }
  | { ok: false; status: 401 | 403 };

export async function checkAdmin(): Promise<AdminCheck> {
  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401 };

  const admin = await prisma.adminUser.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, isActive: true },
  });
  if (!admin || !admin.isActive) return { ok: false, status: 403 };

  return { ok: true, adminId: admin.id, clerkUserId: userId };
}

/**
 * For admin API route handlers. Returns a 401/403 Response to send back, or
 * null when the caller is an active admin. Never returns any data.
 */
export async function requireAdminApi(): Promise<Response | null> {
  const result = await checkAdmin();
  if (result.ok) return null;
  return Response.json(
    { error: result.status === 401 ? 'Unauthorised' : 'Forbidden' },
    { status: result.status },
  );
}

/**
 * For admin pages and layouts. Non-admins get a plain 404 so the admin area
 * doesn't advertise itself. (Signed-out users are already sent to sign-in by
 * the proxy before reaching this.)
 */
export async function requireAdminPage(): Promise<void> {
  const result = await checkAdmin();
  if (!result.ok) notFound();
}
