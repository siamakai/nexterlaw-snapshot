-- Admin users for /admin (Phase 1 security fix).
-- Each admin must have signed in once through Clerk; copy their user id (starts "user_")
-- from the Clerk dashboard → Users. Replace the placeholders, then run against the
-- production database AFTER the migrations (see prisma/migrations/README.md).
-- To remove someone's access later: UPDATE "AdminUser" SET "isActive" = false WHERE email = '...';

INSERT INTO "AdminUser" (id, "clerkUserId", email, role, "isActive", "createdAt", "updatedAt")
VALUES
  ('admin_' || md5(random()::text), 'user_REPLACE_ME', 'info@i-review.ai', 'owner', true, now(), now())
  -- , ('admin_' || md5(random()::text), 'user_REPLACE_ME_2', 'someone@example.com', 'editor', true, now(), now())
ON CONFLICT ("clerkUserId") DO UPDATE SET "isActive" = true, "updatedAt" = now();
