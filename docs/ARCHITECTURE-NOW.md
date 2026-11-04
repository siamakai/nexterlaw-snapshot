# Architecture now

Phase 0 map. Read-only; nothing changed.

## Which code is live (resolved 4 Nov 2026)
- **Live repo: `github.com/siamakai/nexterlaw-snapshot`, branch `main` @ `f85df8a` (16 Sep 2026).** Vercel project `nexter-ais-projects/nexterlaw-snapshot` deploys it to production on every push to `main`.
- `github.com/alisadri1985-max/nexterlaw-snapshot` (@ `264fcd9`, 2 Sep) is an **older copy**. The live repo contains all of it plus 3 commits:
  - `5e3c651` Add Global/Worldwide Snapshot pathway; remove Clio 2026 content
  - `b562cdd` Add CSV export for Global submissions; simplify confirmation copy
  - `f85df8a` Remove secondary states/provinces from Global jurisdiction step
- Local checkout: remote `live` = Siamak's repo, `origin` = Ali's copy. Branch `redesign/snapshot-v2` now starts from `live/main`.
- **Warning: pushing to `live/main` deploys to production immediately.** v2 work must stay on branches until GO.

Sections below were mapped on `264fcd9` (line numbers refer to it; `page.tsx` has grown from 1,399 to 2,255 lines, so UK step line numbers have shifted by ~+240). The Global additions are described in their own section.

## Global path (live, added in `5e3c651`–`f85df8a`)
**Design choice in the code:** the Global path is a **separate model (`GlobalSubmission`) and flow**, kept apart so the UK flow is untouched. The schema comment records a project decision that **no score is calculated or shown for Global**, because an automated score would misrepresent a knowledge base that doesn't exist for most countries. **This conflicts with spec §2 (instant score for Global)**; see V2-PLAN C9.

| Step (`page.tsx`) | Lines | Collects |
|---|---|---|
| regionChoice | ~737-800 | UK → `intake`, Other → `globalJurisdiction` |
| globalJurisdiction | ~1643 | Country dropdown (`GLOBAL_COUNTRIES`, UK excluded), state/province for US/CA/AU, regulatory body (other countries), secondary jurisdiction |
| globalDetails | ~1753 | Contact name, firm, website, work email, phone, size (own taxonomy), primary + secondary practice areas |
| globalAiUse | ~1938 | Using AI? tools in use, have an AI policy? clients asked about AI? |
| globalAssessment | ~2024 | The 10 CLEAR TRUST questions (generic wording) |
| globalContext | ~2101 | Biggest concern, what would help most, contact permission (Yes/No) |
| globalSubmitting → globalDone | | Confirmation, no score |

Back end:
- `POST /api/submit-global`: zod, creates `GlobalSubmission` (status PENDING), sends **internal team notification** to `TEAM_NOTIFICATION_EMAIL` (skipped if unset). **No acknowledgement email to the firm.** No rate limit.
- `/admin/global-submissions`, `/admin/global-submissions/[id]` (status editor: PENDING → RESEARCHING → REPORT_READY → SENT + internal notes), `GET/PATCH /api/admin/global-submissions/[id]`, `GET /api/admin/global-submissions/csv`. **All without auth.** The Global CSV adds **contact name and phone number** to what's exposed.
- Reports are written and sent **outside the app** (no report storage, no AI draft, no delivery link).
- Team email puts `contactName`, `firmName`, `workEmail` into HTML un-escaped.
- `scripts/remove-clio-kb-entries.ts` removes the Clio 2026 KB entries (40 lines deleted from the seed).
- New env var name: `TEAM_NOTIFICATION_EMAIL`.

## Stack
Next.js 16.2.10 (App Router) · React 19.2.4 · Prisma 7.8 + Postgres · `@anthropic-ai/sdk` 0.110 · `@react-pdf/renderer` · Resend · shadcn/base-ui components · Clerk and Upstash **installed but never imported**.
No tests, no test script. `node_modules` is not installed in this checkout.

## Hosting: Vercel in production (spec assumed Netlify)
- Live response headers: `Server: Vercel`, `X-Vercel-Id: fra1::…`; script URLs carry Vercel `dpl_` ids.
- `vercel.json` is the config in use: `maxDuration` submit 300 s, report 30 s, pdf 60 s.
- `netlify.toml`, `netlify/functions/generate-report-background.ts` and `@netlify/functions` are Netlify leftovers. The submit route only calls the Netlify function when `process.env.URL` is set (`src/app/api/submit/route.ts:107-115`). Vercel sets `VERCEL_URL`, not `URL`, so **production generates the report inside the submit request via `after()`** (l.117).
- Risk: up to 3 Opus attempts × 16k tokens can exceed the 300 s limit.

## Routes (no route has any auth check; there is no `middleware.ts`/`proxy.ts`)
| Route | Method | What it does |
|---|---|---|
| `/` | GET | `src/app/page.tsx`, one 1,399-line client component holding every step |
| `/admin` | GET | Redirects to `/admin/submissions` |
| `/admin/submissions` | GET | Latest 200 submissions with firm name + email |
| `/admin/knowledge-base` | GET | KB editor UI |
| `/api/submit` | POST | Validate (zod), upsert Lead, create Submission (PENDING), start generation, 202 |
| `/api/report/[id]` | GET | Status; when COMPLETE also scores, report, pdfUrl. Leaks raw `failureReason` (l.70) |
| `/api/report/[id]/pdf` | GET | Renders the PDF on every request |
| `/api/admin/kb`, `/api/admin/kb/[id]` | GET POST PATCH DELETE | KB CRUD, **open to anyone, including hard delete** |
| `/api/admin/submissions/csv` | GET | **Every lead's firm, email, city, country, scores, open to anyone** |
| `/.netlify/functions/generate-report-background` | POST | Runs pipeline for `{submissionId}`, no auth (probably not deployed on Vercel) |

## Front-end flow (`page.tsx`)
| Step | Lines | Notes |
|---|---|---|
| landing | 304-562 | "5 firm details" l.511; "No Sales Call" l.365; no footer privacy link |
| intake (firm details) | 566-774 | City/country free text; website required but unvalidated; free-email *warning*; errors only recompute on Continue |
| selfAssessment (10 Qs) | 778-909 | Yes / Not sure / No; all ten on one screen |
| consent | 913-996 | **One** checkbox mixing "not advice" + contact consent; privacy link `href="#"` (l.957) |
| processing | 1000-1157 | Progress is fake (+15 per poll, cap 90). "30–60 seconds" l.1152. No timeout. On FAILED/network error sends user back to consent → resubmit = new paid run |
| result | 1161-1396 | Score ring, bars, top 3 opportunities/exposures. **Does not show `upsell`**, disclaimer, share or email actions |

## Back-end pipeline
1. **`/api/submit`** (zod l.8-32): `consentGiven: literal(true)`. Lead found by `workEmail` (not unique) and **overwritten**. `privacyVersion` never written (default "1.0").
2. **`pipeline.ts`**: status SCORING → RETRIEVING → GENERATING → COMPLETE/FAILED.
   - `computeScores` (l.55), saved (l.65).
   - KB retrieval; EU layer included when EU = YES **or NOT_SURE** (l.71).
   - `generateReport` (l.97).
   - Google Sheets row "API Usage" A:M with **firm name + work email** + token/cost data (l.111-125).
   - `GeneratedReport` with `validationPassed: true` hard-coded (l.128-145).
   - Day-0 email (failure ignored). Not idempotent: re-running a COMPLETE submission pays for Opus, then fails on the unique `submissionId` and marks the good report FAILED.
3. **`report-generator.ts`**: model `claude-opus-4-8` (l.30), `max_tokens` 16000 (l.311), up to 3 attempts. Forced tool `generate_ai_readiness_report` → `cover`, `scoreNarrative`, `regulatoryMap{sra, ukGdpr, pii, clientProcurement, euAiAct?}`, `shadowAi`, `opportunities[3-5]`, `exposures[3-5]`, `upsell`. Prompt caching on system block + KB block. Grounding rule "only use KB entries" at l.98. No "Not sure = unknown" rule.
4. **`knowledge-retrieval.ts`**: filter by practice type and size; top N by weight (regulatory 8, use cases 5, risks 6, EU 3, tools 4).
5. **PDF** (`pdf-template.tsx`): shows all opportunities/exposures; upsell box prints plain "nexterlaw.com" (l.435), no link.
6. **Email** (`email.ts`): FROM hard-coded `no-reply@nexterlaw.com` (l.4) but body says "reply to this email" (l.50); `BASE_URL` default `snapshot.nexterlaw.com` (l.5, live is `snapshotapp.`); booking link falls back to `#`; `firmName` not HTML-escaped; Day-3/Day-7 written, never sent.

## Scoring (`scoring.ts:37-66`)
YES 10 / NOT_SURE 5 / NO 0. Size and sensitivity weights multiply both the score and the maximum, so they **cancel**. Each dimension is 0/50/100; headline is a plain mean (multiple of 5). Band lookup falls back to IN_CONTROL if nothing matches. Harmless today, but a real weighted score of 39.4 would become "In Control".
Band data duplicated in 6 places: `constants.ts:110`, `api/report/[id]/route.ts:11`, `pdf/route.ts:9`, `admin/submissions/page.tsx:6`, hard-coded 70/40 in `page.tsx:196` and `pdf-template.tsx:28`. Dimension lists duplicated in 3 more files (inconsistent "Usage Governance"/"Usage governance").

## Data model (`prisma/schema.prisma`)
- In use: Lead, Submission, GeneratedReport, KnowledgeBaseEntry.
- **Unused:** PracticeType, ClearTrustDimension, ScoringRule, ScoreBand, PromptTemplate, EmailTemplate, EmailLog, AdminUser. Enum values REVIEW_REQUIRED, RENDERING_PDF never set; `retryCount` never used.
- **No `prisma/migrations` folder**: the DB has been managed with `db push`. The first v2 migration needs a baseline (`migrate diff` → `0_init`, marked applied) before additive migrations.

## Knowledge base (`knowledge-base-seed.ts`, 64 entries)
REGULATORY_GUIDANCE 19 · USE_CASE_LIBRARY 16 · RISK_LIBRARY 14 · TOOL_CATEGORIES 10 · CONDITIONAL_EU_LAYER 5.
The seed **skips existing titles**, so fixing the seed file does not fix production rows.
References needing solicitor review: l.42, 48, 51, 102/105, 120/123, 138/141, 156/159, 168, 349, 421, 486, 496, 503/506, 516. Full table goes to `docs/KB-REVIEW.md` in Phase 2.

## Env var names (values never read)
- Declared in `env.ts` (which is **never imported**, so validation never runs): DATABASE_URL, ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM_ADDRESS*, RESEND_FROM_NAME*, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_PRIVACY_VERSION*, CALENDLY_BOOKING_URL, GHL_WEBHOOK_URL*, GHL_API_KEY*, NODE_ENV. (* declared but unused.)
- Read directly: URL, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_SHEET_ID.

## Spec §0 check
| Spec item | Result |
|---|---|
| 0.1 repo behind live | **Confirmed and resolved**: live code is `siamakai/nexterlaw-snapshot` @ `f85df8a` (Ali's copy has 33 commits, not one; live has 36) |
| 0.2.1 admin no login | **Confirmed** |
| 0.2.2 CSV open | **Confirmed**, and the live code adds a second open CSV (Global) with names + phone numbers |
| 0.2.3 KB create/edit open | **Confirmed**, and DELETE too |
| 0.2.4 background fn open | Confirmed in code; **probably not deployed on Vercel** |
| 0.2.5 no rate limiting | **Confirmed** |
| 0.2.6 Sheets has name + email | **Confirmed** |
| 0.3 rows | All confirmed, except hosting: **Vercel, not Netlify** |

## Not in the spec
1. Reports and PDFs are public to anyone with the cuid. The PDF re-renders on every hit.
2. Client resubmits after any error and the pipeline isn't idempotent, so duplicate paid runs are possible.
3. `/api/report/[id]` returns raw error text to the browser.
4. Day-0 email: un-escaped `firmName` (HTML injection into our own email); "reply" to a no-reply address.
5. Lead overwritten per email, so earlier firm details are lost.
6. The failure message shows a personal agency email (`page.tsx:285`).
7. RISK_LIBRARY also carries SRA references (l.349, l.421), so the KB review must cover it too.
8. EU layer triggers on "Not sure", which may be intended but should be a decision.
