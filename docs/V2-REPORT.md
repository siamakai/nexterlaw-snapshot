# Snapshot v2: build report

8 Nov 2026 · branch `redesign/snapshot-v2` (built on `hotfix/admin-auth`, which is built on live `main` @ `f85df8a`).
**Nothing is deployed, pushed (beyond the Phase 1 branch) or committed for v2 yet.** No production database, email, Anthropic or GoHighLevel calls were made.

## What's built, by phase

| Phase | Done | Not done / needs you |
|---|---|---|
| 1 Security | Clerk + active `AdminUser` on all admin pages/APIs; Upstash rate limits; result tokens; no duplicate paid runs; escaped emails; background-function secret | Preview deploy blocked by Vercel's Git link (U3) |
| 2 Webinar must-fix | "Your next step" block on results page **and PDF (clickable)**, routed per spec §3 with the AI `upsell`; two consent boxes + `marketingConsent(+At)` + `privacyVersion`; copy ("10 quick questions · 4 firm details · Instant PDF report", "about a minute", "Free · No obligation"); whole-tile checkboxes, errors clear when fixed, website check; "Not sure = unknown" prompt rule; `isTest`; email base URL default fixed to `snapshotapp.`; `docs/KB-REVIEW.md` (35 entries) | Real URLs (#9), privacy URL (#8), solicitor review (#11) |
| 3 Trustworthy reports | `content/approved-references.ts` + post-generation check → regenerate ≤2 → remove; results saved in `validationPassed/Errors`; new `quickWins`, `intakeNote`, `plan90Day`; `promptVersion` saved; score shown immediately and "full report by email" after 120 s or on failure (+ team alert + admin **Retry**); scoring weight removed (identical results), one band source, no band gaps; model comparison script | Approved list is empty until the KB is reviewed. Comparison script **not run** (paid) |
| 4 New flow + Global | `page.tsx` (2,255 lines) split into one component per step; questions → intake → details + consent; Intake Opportunity rating; "Just me" size; city dropped; free-email warning; phone one-question-per-screen with progress bar; honest building screen from real status. Global: instant score + due date in the firm's time zone, acknowledgement email, AI first draft (mock-tested), review → edit → **approve & send** in `/admin/global-submissions/[id]`, delivery via `/r/{token}` + PDF, waitlist switch | Jurisdiction notes (#7) are empty by design |
| 5 Results, CRM, analytics | `/r/{token}` with the spec §2 section order, reload-safe and shareable; Download PDF / Email me / Copy link; retake reminder; click tracking (`nextStepClickedAt`); GoHighLevel sync (mock by default; tags/fields below); analytics events (no personal data, scores bucketed) | GHL go-live (GO + Parastoo's field names); analytics provider (N11) |
| 6 Polish + proof | Trust block (creator line, monogram/photo, sample-report link when set); footer privacy link + brand line; skip link, `lang="en-GB"`, labelled fields, radio/checkbox roles, error announcements, focus handling, AA contrast fix for small text; works from 360 px (no sideways scroll; headline 24.8 px on phones instead of ~14 px); benchmark block (hidden until 30 per size band); Vitest + Playwright | Lighthouse not run; no formal WCAG audit |

## Design
Same navy/gold identity, Playfair headings, hero, cards and dark results page. Visible changes: the copy above, a trust block under the hero, phone layouts, and the muted small-text colour lightened slightly (#5b7290 → #8a9fbd) to pass AA contrast.

## Checks (8 Nov)
| Check | Result |
|---|---|
| `npm run lint` | **0 problems** (the 10 pre-existing errors are gone with the `page.tsx` split) |
| `npm run typecheck` | Pass |
| `npm test` (Vitest) | **91/91**: scoring, bands, next-band hint, intake rating, one routing case per spec row, reference check (all spec examples caught), regenerate/strip logic, CRM payload/consent/test-skip/modes, admin 401/403, rate limits, tokens, endpoints |
| `npm run e2e` (Playwright, local DB, mock reports, installed Chrome) | **4/4**: UK happy path + reload + PDF; consent rules; Global path to confirmation; phone one-per-screen with no sideways scroll |
| `npm run build` | Pass; all new routes registered |
| Manual (browser, desktop + 375 px) | Landing, path choice, questions, intake, details (errors clearing), results page, Global confirmation, PDF download (links checked) |
| Migrations | `0_init` + `add_result_token` + `v2_core` applied cleanly to a fresh local database; seed runs |

## Not verified (be aware)
- **Real AI output.** All end-to-end runs used mock mode; the new prompt and tool fields haven't been run against Opus. Run the comparison script (#12) or one real test submission on a preview.
- **Emails.** Templates were built but not delivered (no Resend key locally). Check Day-0, Global acknowledgement, Global report-ready and team alert in a real inbox on preview.
- **Admin screens in a browser** (they need Clerk keys): the Global review/approve screen and Retry button are tested only at API level.
- Upstash and GoHighLevel live modes; Lighthouse scores.

## Environment variables to add in Vercel (names only)
| Name | Purpose | Required? |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://snapshotapp.nexterlaw.com` (email and CRM links) | Yes |
| `NEXT_PUBLIC_PRIVACY_URL` | Privacy notice link | Strongly recommended |
| `NEXT_STEP_GOVERNANCE_CALL_URL`, `NEXT_STEP_INTAKE_REVIEW_URL`, `NEXT_STEP_SNAPSHOT_REVIEW_URL`, `NEXT_STEP_WEBINAR_URL`, `NEXT_STEP_SKOOL_URL`, `NEXT_STEP_COURSE_AI_LAW_URL` | Next-step buttons (unset → email link) | Yes, before the webinar |
| `RESOURCE_COURSE_RESPONSIBLE_AI_URL`, `RESOURCE_COURSE_AI_BUSINESS_URL`, `RESOURCE_COURSE_WHO_OWNS_URL`, `RESOURCE_WEBINAR_RECORDING_URL`, `RESOURCE_PODCAST_*_URL` (UNDERWOOD, WITHANE, WAINWRIGHT, SHAIRE, MACLEAN, ANGOOD, BUIE, HOLDEN) | 90-day-plan links (podcasts fall back to the YouTube channel) | Recommended |
| `TEAM_INBOX_EMAIL` | Optional override for team emails (Global submissions + failed-report alerts). Default services@nexterai.agency; `TEAM_NOTIFICATION_EMAIL` is no longer read | No |
| `GHL_MODE` (`mock` default / `live` / `off`), `GHL_WEBHOOK_URL`, `GHL_API_KEY` | CRM sync | `live` only after GO |
| `REPORT_MODEL` | Switch model after the comparison | Optional |
| `NEXT_PUBLIC_GLOBAL_SHOW_SCORE`, `NEXT_PUBLIC_GLOBAL_WAITLIST`, `NEXT_PUBLIC_RENAME_RIGHTS`, `NEXT_PUBLIC_SAMPLE_REPORT_URL`, `NEXT_PUBLIC_CREATOR_PHOTO_URL` | Switches (see OPEN-DECISIONS) | Optional |
| `RESEND_FROM_ADDRESS`, `RESEND_FROM_NAME` | Sender (now actually used) | Optional |
| From Phase 1: Clerk keys, `UPSTASH_REDIS_REST_URL/TOKEN` | Admin login, rate limits | Yes |
| **Never in production:** `REPORT_GENERATOR_MODE` | Mock reports for local tests (ignored in production anyway) | — |

## GoHighLevel (for Parastoo)
Webhook payload: `event` (`snapshot_completed`, `global_submitted`, `global_report_sent`, `retake_reminder_requested`), `contact` {email, firmName, name, phone, website, country}, `tags`, `customFields`, and for Global an `opportunity` {pipeline "Global Snapshot", dueAt, reminderAt (36 h)}.
Tags: `snapshot-v2`, `path-uk|global`, `band-*`, `size-*`, `intake-*`, `eu-*`, `route-*`, `snapshot-global`, `country-*`; marketing tags (`marketing-consent`, `nurture-snapshot`, `retake-reminder`) **only with consent**. Custom fields: `snapshot_score`, `snapshot_band`, `snapshot_results_url`, `snapshot_route`, `snapshot_intake_rating`. Test submissions are never sent.

## Deploy checklist (each step needs your GO)
1. Fix the Vercel Git link (U3) so branches build previews.
2. Create `AdminUser` rows for every admin (otherwise nobody can open admin).
3. Add the env vars above to **Preview** first.
4. Database (see `prisma/migrations/README.md`): `prisma migrate resolve --applied 0_init`, then `prisma migrate deploy` (adds token + v2 columns; all additive, rollback notes included). Do this before the new code goes live.
5. Push `redesign/snapshot-v2`, test on the preview: one UK and one Global submission with an `@example.com` email; read the real report; check every email arrives; approve the Global report in admin; open the links on a phone.
6. Merge to `main` (= production). Watch the first few real submissions in Admin → Submissions (Refs column shows the reference check).
7. Rollback: redeploy the previous build; the new columns are ignored by old code.

## Run it locally
```
npx prisma dev -d -n snapshot          # local Postgres (prints its URL)
DATABASE_URL=<that url> npx prisma migrate deploy && npm run db:seed
# .env.local: DATABASE_URL, NEXT_PUBLIC_APP_URL=http://localhost:3100, REPORT_GENERATOR_MODE=mock, GHL_MODE=mock
npm run dev -- -p 3100
npm test && E2E_DATABASE_URL=<that url> npm run e2e
```
