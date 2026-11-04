# Phase 1 report: security hotfix

Branch `hotfix/admin-auth`, based on the live code (`siamakai/nexterlaw-snapshot` `main` @ `f85df8a`). 4 Nov 2026.
**Not committed, not pushed, not deployed.** No database, email, Anthropic or Upstash calls were made.

## What changed
| Area | Change | Files |
|---|---|---|
| Admin login | Clerk on `/admin/**` and `/api/admin/**` via the Next 16 `proxy.ts`; every admin page and API handler also checks for an **active `AdminUser`** row. Signed-out API calls → 401, non-admins → 403, never data. Non-admin pages → 404 | `src/proxy.ts`, `src/lib/security/admin-auth.ts`, `src/app/admin/**`, `src/app/api/admin/**` (8 handlers, incl. both CSVs and the Global routes) |
| Rate limits (Upstash) | `/api/submit` 10/h per IP + 3/h per email; `/api/submit-global` same; report status 120/min per IP; legacy id links 20/min; PDF 20/min. Fails open if Upstash is missing/down (logged) | `src/lib/security/rate-limit.ts`, both submit routes, both report routes |
| Result token | New `Submission.resultToken` (32 random chars). Report + PDF links and the Day-0 email use it. Old id links in sent emails still work, with the tighter legacy limit | `src/lib/security/tokens.ts`, `report-access.ts`, report routes, `pipeline.ts`, `page.tsx` |
| No duplicate paid runs | Pipeline atomically claims PENDING → SCORING; a second trigger does nothing (no Opus call, no overwriting a finished report). Front end keeps polling through short network/429 blips instead of sending the user back to resubmit | `pipeline.ts`, `page.tsx` |
| Error leak | `/api/report` no longer returns raw `failureReason` to the browser | `api/report/[id]/route.ts` |
| Email injection | Firm, contact, email, country, region and practice area are HTML-escaped in all emails (incl. the Global team notification) | `email.ts` |
| Background function | Requires `x-background-secret` = `BACKGROUND_FUNCTION_SECRET`; refuses everything if unset. Only used on Netlify; production (Vercel) keeps using `after()` | `netlify/functions/…`, `api/submit/route.ts`, `env.ts` |
| Migrations | First migration history: `0_init` baseline (= live schema) + additive `add_result_token`, with rollback notes | `prisma/migrations/**` |
| Tests | Vitest added (`npm test`), 47 tests | `tests/*`, `vitest.config.ts` |
| Scripts | `test`, `typecheck` (`next typegen && tsc --noEmit`) | `package.json` |

## Checks
| Check | Result |
|---|---|
| `npm test` | **47/47 passed** (admin 401/403 on all 8 admin handlers with no data access, rate limits, token vs legacy lookup, no error leak, pipeline idempotency, background secret, escaping) |
| `npm run typecheck` | **Pass** |
| `npm run build` | **Pass** (needs any `DATABASE_URL` value locally; Vercel has the real one). Proxy registered |
| `npm run lint` | 10 errors, **all pre-existing** in the live code (9 × `react-hooks/static-components` in the results section of `page.tsx`, 1 × `any` in `prisma/seed.ts`). Changed files: 0 errors. These go away with the Phase 4 split of `page.tsx` |
| Screenshots | No visible change to the public pages. Admin pages now show Clerk sign-in, or a 404 for non-admins. Can't be shown without Clerk keys locally; check on the preview |

`npm install` also updated `package-lock.json`: it was already out of sync with `package.json` (missing `@emnapi/*` entries), plus Vitest.

## Before deploying (needs your GO for each step)
1. **Create `AdminUser` rows first** (`clerkUserId`, `email`, `isActive = true`) for each person who needs admin. **Without them nobody can open the admin area after deploy** (fail closed by design).
2. **Vercel env vars**: check these names are set for Production and Preview: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Without the Upstash pair the site works but **rate limiting is off** (a warning is logged).
3. In Clerk, turn off public sign-ups (or restrict to your domain). Not strictly needed (non-admins get 403), but tidier.
4. **Database** (see `prisma/migrations/README.md`): `prisma migrate resolve --applied 0_init`, then `prisma migrate deploy`, **before** the new code goes live.
5. Push `hotfix/admin-auth` → Vercel preview → run the checks below → merge to `main` (= production).
6. Not needed on Vercel: `BACKGROUND_FUNCTION_SECRET`.

## What to check on the preview (from the instructions)
- Logged out: `/admin/submissions`, `/admin/global-submissions` → Clerk sign-in. `/api/admin/submissions/csv` and `/api/admin/global-submissions/csv` → `401`.
- Logged in as a non-admin Clerk user → admin pages 404, APIs 403.
- Logged in as an admin → everything works as before.
- A UK test submission (use an `@example.com` email) completes, the results page loads, and the PDF link contains a long token, not the id.

## Do this today, even before the deploy
If the open admin URLs are live (decision U1), you can block them **right now without any code** in Vercel → project → **Firewall** → custom rule: path starts with `/admin` or `/api/admin` → **Deny**. Remove the rule once this hotfix is live. I haven't made this change: it's your account setting.

## Not in Phase 1 (on purpose)
Google Sheets holding names/emails (U4), email base URL default, consent split, KB review: Phase 2. Netlify clean-up: waits on decision U3.
