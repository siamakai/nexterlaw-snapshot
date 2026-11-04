# Snapshot v2 plan

Built from `SNAPSHOT-V2-SPEC.md`, `ARCHITECTURE-NOW.md` and `COMPETITOR-COMPARISON.md`. 4 Nov 2026.
Estimates are focused developer-days with Claude Code, excluding Siamak's review time.
Design rule throughout: **keep the navy/gold identity, the serif headlines, the CLEAR TRUST name, the 10 dimensions and the 3 bands.** Improvements are layout, clarity and conversion, not a new look.

## Live code: resolved
The live code is `github.com/siamakai/nexterlaw-snapshot` `main` @ `f85df8a`; Vercel auto-deploys every push to `main`. Work branches now start from it. **Never push to `main` without GO: it goes straight to production.**
The instructions file names Ali's repo; update it to Siamak's. Ali's copy is 3 commits behind.

## Spec/code conflicts found
| # | Spec says | Code/live shows | Proposal |
|---|---|---|---|
| C1 | Netlify + background function | Live is **Vercel**; generation runs via `after()` inside `/api/submit` (300 s cap) | Treat Vercel as the host. Phase 1 secures `/api/submit` and makes the pipeline idempotent; delete the Netlify function + `netlify.toml` once confirmed `[CONFIRM]` |
| C2 | "Repo has one commit" | 33 commits; HEAD 264fcd9 | None (doc fix only) |
| C3 | Schema changes as "additive Prisma migrations" | No migrations folder; DB built with `db push` | Phase 1 adds a baseline migration (`0_init`, marked applied) generated against a **local** copy of the schema; Siamak/dev runs `migrate resolve` on prod only after GO |
| C4 | Fix KB references in the seed | Seed skips existing titles, so prod rows won't change | Fixes go through a reviewed data migration script, run only after GO |
| C5 | KB review = REGULATORY_GUIDANCE + RISK_LIBRARY | References also in CONDITIONAL_EU_LAYER (EU AI Act Art. 52 / "Title X") | Export all 5 categories that contain citations |
| C6 | Background function shared secret | Function probably not deployed | Still add the secret (cheap), but the real fix is idempotency + rate limit on `/api/submit` |
| C7 | Show "honest stage text" | Front end never reads status; progress is fake | Return `status` → stage text map; keep the ring animation |
| C9 | Global: show an **instant CLEAR TRUST score** (§2.1) | Live code deliberately calculates **no score** for Global (recorded decision in `schema.prisma` comment) | Decide `[CONFIRM]`. Recommended: show the score with a clear "based on universal CLEAR TRUST practice, not yet {country} law" caption. The 10 questions are jurisdiction-neutral, so the score is honest; the jurisdiction detail comes in the human report |
| C10 | Global uses the UK Lead/Submission tables + `AWAITING_REVIEW` status (§5) | Separate `GlobalSubmission` model with its own status lifecycle (PENDING → RESEARCHING → REPORT_READY → SENT) and richer intake (contact name, phone, AI tools, policy, biggest concern, what would help) | **Keep the separate model**; extend it (`resultToken`, `reportDraft`, `approvedBy/At`, `dueAt`, `isTest`, `marketingConsent`) instead of moving Global into Submission. Spec's `AWAITING_REVIEW` maps to `RESEARCHING` |
| C11 | Global acknowledgement email (§2.2) | Only an internal team notification exists | Add the acknowledgement email in Phase 4 |
| C12 | Spec's Global extra fields: country + optional state | Live already removed secondary states (`f85df8a`) and has regulatory body, phone, AI-use and context questions | Keep the live fields; they are good qualification data for routing |
| C8 | UK flow puts the form after the questions | Competitors (Vable, ibl.ai) also **show the score before the form** | Proposal P1 below; needs a decision because it changes lead capture `[CONFIRM]` |

## Phases

### Phase 1 — Security hotfix (`hotfix/admin-auth`, ship first) · ~2 days · risk: high if delayed
| Work | Files | Notes |
|---|---|---|
| Clerk on `/admin/**` + `/api/admin/**` **including `/admin/global-submissions` and the Global CSV**; only active `AdminUser` | new `src/proxy.ts` (Next 16 renamed middleware → check `node_modules/next/dist/docs`), `admin/layout.tsx`, admin API routes | 401/403, never data. Defence in depth: check in each route too, not only the proxy |
| Rate limit `/api/submit`, **`/api/submit-global`** (IP + email), report + PDF endpoints | new `src/lib/rate-limit.ts` (Upstash, already installed) | Fail open with logging if Upstash is down `[CONFIRM]` |
| Escape firm/contact fields in the Global team email | `email.ts` | Small |
| Idempotent pipeline: skip if already COMPLETE/GENERATING; no resubmit on network error | `pipeline.ts`, `page.tsx` handleSubmit | Stops duplicate Opus spend; not in spec but same risk class |
| `resultToken` (random, 32 bytes) for report/PDF; old cuid route kept but rate-limited | schema (additive), `api/report/*` | Also stop returning raw `failureReason` |
| Shared secret on background function | `netlify/functions/…`, submit route | Or delete it if C1 confirmed |
| Escape `firmName` in emails | `email.ts` | Small |
| Tests (Vitest): auth denied/allowed, rate limit, token lookup | new `tests/` | Adds Vitest |

### Phase 2 — Must-fix for the 18 Nov webinar · ~3 days
| Work | Files |
|---|---|
| "Your next step" block (spec §3) from `config/next-steps.ts` + AI `upsell`, on results page and as a **clickable** link in the PDF | `page.tsx` result step, `pdf-template.tsx:430-435`, new `src/config/next-steps.ts` |
| Two consent boxes; `Lead.marketingConsent(+At)`; write `privacyVersion` from env; working privacy link (config) | `page.tsx:948-959`, submit route, schema |
| Copy: "10 questions · 4 details · Instant PDF report", "about a minute", "Free · No obligation" | `page.tsx:365, 511, 1152` |
| Form: whole tile clickable, errors clear on change, website URL validation | `page.tsx:566-774` |
| Prompt: "Not sure = unknown, never absent" | `report-generator.ts` system prompt |
| `isTest` flag (`@example.com`, `ZZ TEST…`) | submit route, schema, sheets |
| Email base URL: check `NEXT_PUBLIC_APP_URL` set in prod; fix default to `snapshotapp.` | `email.ts:5` |
| Email: reply-to a real inbox (or remove "reply" line) `[CONFIRM]` | `email.ts:4,50` |
| `docs/KB-REVIEW.md` export (all citation-bearing entries) | script only, no KB edits |

### Phase 3 — Trustworthy reports · ~4 days
| Work | Files | Risk |
|---|---|---|
| `content/approved-references.ts` + post-generation reference scan → regenerate ≤2 → strip; write `validationPassed/Errors` | new files, `pipeline.ts`, `report-generator.ts` | Medium: regex must catch "para 4.2", "Rule 6.3", "Art. 35" variants. Approved list itself is `[CONFIRM]` (needs solicitor) |
| New tool fields `quickWins[3]`, `intakeNote`, `plan90Day[3]` (ids from `config/resources.ts`); save `promptVersion` | `report-generator.ts`, schema | Low |
| Instant score always shown; on failure / >120 s, "full report by email" and keep submission | `page.tsx` processing, pipeline | Low |
| Scoring: fix weighting (true weighted mean) **or** remove; one `BANDS` source used by all 6 places; band lookup never defaults to In Control | `scoring.ts`, `constants.ts` + 5 files | Medium: changes historic comparability if weighted |
| Model comparison script, 10 seeded firms, current vs faster model → `docs/model-comparison/` | new `scripts/` | **Needs GO**: it calls the Anthropic API (cost) |

### Phase 4 — New flow + Global path · ~6–8 days (depends on live code)
- Split `page.tsx` into `components/steps/*` (Landing, PathChoice, Questions, Intake, Details, Consent, Building, Results).
- Order: path → 10 questions → intake questions → details + consent → building → `/r/{token}`.
- Intake Opportunity rating (spec thresholds, `[CONFIRM]`); firm size `SOLE`; city optional; free-email warning kept.
- Mobile: one question per screen with progress bar; desktop: all ten.
- Global (builds on the live `GlobalSubmission` flow, not a rewrite): score per decision C9 + due date in firm's time zone, acknowledgement email, AI draft from `content/jurisdictions/` stored on the submission, review → edit → approve added to the existing `/admin/global-submissions/[id]` screen, delivery via `/r/{token}`, waitlist switch (off). Reorder Global steps to match UK (questions before contact details).

### Phase 5 — Results page, CRM, analytics · ~4 days
`/r/{token}` with the spec §2 order; email-me + copy-link; GoHighLevel sync against a mock (real calls after GO); follow-ups per decision; analytics events (no personal data).

### Phase 6 — Polish and proof · ~3 days
Landing trust block + sample report; WCAG 2.2 AA; 360 px; Lighthouse; Vitest + Playwright; hidden benchmark block; final screenshots + deploy checklist.

**Total ≈ 22–24 dev-days.** The 18 Nov webinar is 10 working days away: Phases 1 + 2 fit; Phase 3 partly.

## Improvements proposed beyond the spec (all need your OK)
From `COMPETITOR-COMPARISON.md` and the code review. Design stays navy/gold.

| # | Proposal | Phase | Effort | Why |
|---|---|---|---|---|
| P1 | **Show score + band before the details form**; the form unlocks the full AI report, PDF, 90-day plan (Vable's "one form, three things back") | 4 | S | Value first; competitors do it. Trade-off: some people leave with just the score. A/B test it |
| P2 | Two more intake questions: **timeline** ("when do you want this in place?") and **biggest barrier** | 4 | S | Strongest buying signals; feed routing + report |
| P3 | "How we score" panel: band cut-offs published; each dimension shows the rule it maps to (approved list only) + "advisory, not an audit" | 5 | S | Rigour; answers Solicitor News' regulatory pitch |
| P4 | LinkedIn share of the *band* (no score details, no firm data) from `/r/{token}` | 5 | S | Spreads the tool |
| P5 | Retake loop: "Retake in 90 days" reminder + before/after comparison on the results page | 5 | M | Re-engagement; ties to Skool |
| P6 | Starter AI-use policy (editable .docx) as a post-report download | later | M | Lasting value; needs solicitor review of the template |
| P7 | Save progress locally (questions survive a reload/back button) | 4 | S | Mobile drop-off |
| P8 | Cache the PDF after first render (store or memoise) | 3 | S | Speed + cost |
| P9 | Remove Netlify leftovers + dead `formatEntriesForPrompt`, wire `env.ts` validation at boot | 1–3 | S | Fewer surprises |
| P10 | Radar ("CLEAR TRUST wheel") chart next to the bars, navy/gold | 5 | S | Memorable visual for shares and PDF |

Not recommended for v2: the 4-point answer scale (keep the spec's flag), team mode, deep-dive modules.
