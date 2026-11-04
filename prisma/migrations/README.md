# Migrations

Until November 2026 the database was managed with `prisma db push`, so there was no migration history. Phase 1 adds one.

## 0_init (baseline)
`0_init/migration.sql` is the schema exactly as live at `f85df8a` (generated with `prisma migrate diff --from-empty`). It must **never be run** against the existing production database. Instead, mark it as already applied:

```bash
npx prisma migrate resolve --applied 0_init
```

Run this **once per existing database**, only after GO. A brand-new local database just runs `npx prisma migrate deploy`.

## 20261104120000_add_result_token (additive)
- Adds `Submission.resultToken` (nullable `TEXT`) and a unique index.
- Existing rows keep `NULL` and stay reachable through their id (legacy links in emails already sent).
- Safe to apply while the app is running: no locks beyond a quick `ALTER TABLE ... ADD COLUMN` and index build on a small table.

**Order on deploy:** apply the migration **before** the new code goes live (new code writes `resultToken`).

```bash
npx prisma migrate resolve --applied 0_init   # once
npx prisma migrate deploy
```

**Rollback:**
1. Redeploy the previous code (it ignores the column).
2. Only if needed, drop the column:
   ```sql
   DROP INDEX IF EXISTS "Submission_resultToken_key";
   ALTER TABLE "Submission" DROP COLUMN IF EXISTS "resultToken";
   DELETE FROM "_prisma_migrations" WHERE migration_name = '20261104120000_add_result_token';
   ```
   Leaving the column in place is harmless; dropping it breaks any result links sent after the deploy.
