import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Next.js 16 renamed Middleware to Proxy (see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
//
// The proxy is an optimistic first gate only. Every admin page and admin API
// route also calls checkAdmin() (src/lib/security/admin-auth.ts), which checks
// for an active AdminUser row. Do not rely on this file alone.

const isAdminApi = createRouteMatcher(['/api/admin(.*)']);
const isAdminPage = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminApi(req)) {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }
    return;
  }

  if (isAdminPage(req)) {
    // Redirects signed-out visitors to the Clerk sign-in page.
    await auth.protect();
  }
});

export const config = {
  // Only the admin area. Public pages and the public API never go through Clerk.
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
