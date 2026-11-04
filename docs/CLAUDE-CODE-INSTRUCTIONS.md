# Claude Code instructions: AI Readiness Snapshot v2

Repo: https://github.com/alisadri1985-max/nexterlaw-snapshot · Updated 4 Nov 2026 after reading `main` @ `264fcd9`

## How to use this file
1. **First, make sure the repo holds the code that is actually live.** The live app has a UK/Global choice and a Global path; `main` doesn't. Push the deployed code, or tell Claude Code which branch or folder has it.
2. Copy `SNAPSHOT-V2-SPEC.md` into the repo at `docs/SNAPSHOT-V2-SPEC.md`.
3. Open the repo in Claude Code and paste the kick-off prompt below.
4. Claude Code works one phase at a time and stops for your OK after each phase.

---

## Kick-off prompt (paste this into Claude Code)

```
You're working on the NexterLaw AI Readiness Snapshot (Next.js 16 App Router, React 19, Prisma 7 +
Postgres, Anthropic SDK, @react-pdf/renderer, Resend, Clerk, Netlify with a background function).
Live at snapshotapp.nexterlaw.com. The product spec is docs/SNAPSHOT-V2-SPEC.md. Read it fully, starting
with section 0. Also read AGENTS.md: this Next.js version has breaking changes, so check
node_modules/next/dist/docs/ before writing Next.js code.

Ground rules (non-negotiable):
- Work on the branch redesign/snapshot-v2 (Phase 1 security fixes on hotfix/admin-auth). Never commit to main.
- Never push, merge, deploy, run migrations against any non-local database, change env vars, call
  production APIs, send real emails or write to GoHighLevel without my explicit "GO" in this chat.
- Never read or print secret values. Refer to env vars by name only.
- Never touch production data. Use a local Postgres and the seed script.
- Don't add new paid services or dependencies that make network calls without asking. Prefer what's
  already installed (Clerk, Upstash, Resend, zod).
- Anything marked [CONFIRM] in the spec: put it behind config with a placeholder, list it in
  docs/OPEN-DECISIONS.md, and don't invent business facts, URLs, prices or legal citations.
- Never change the wording of a legal or regulatory statement in the knowledge base yourself.
  Flag it for my review instead.
- British English in all user-facing copy. Nothing that reads as legal advice.
- Keep the CLEAR TRUST name, the 10 dimensions, the existing bands and the navy/gold visual identity.
- Schema changes must be additive Prisma migrations, with a rollback note.
- At the end of each phase: run lint, type-check, build and tests, then report (what changed,
  files touched, screenshots of changed screens, test results, open questions) and STOP.

Phase 0 — Make sure we have the live code, then map it (no code changes)
- Check whether this repo contains the UK/Global choice screen and the Global path. If not,
  stop and tell me: the deployed code is elsewhere.
- Check Netlify vs Vercel setup and which one is used.
- Write docs/ARCHITECTURE-NOW.md (routes, data flow, pipeline, KB, PDF, email, env var names)
  and docs/V2-PLAN.md (spec section → files → risk → estimate). Flag any spec/code conflicts.
- Stop.

Phase 1 — Security hotfix (separate branch hotfix/admin-auth; ship first)
- Protect /admin/** and /api/admin/** with Clerk (middleware.ts or the Next 16 equivalent).
  Only allow active AdminUser records. Return 401/403 from APIs, never data.
- Require a shared secret header on the Netlify background function; the submit route sends it.
- Add Upstash rate limiting to /api/submit (per IP and per email) and to the report endpoints.
- Make the report and PDF endpoints use the unguessable result token instead of the raw submission id
  (keep the old id route working for already-sent emails, but with rate limiting).
- Tests for all of the above. Stop and ask me to verify on a preview deploy.

Phase 2 — Must-fix for the 18 Nov webinar
- Results page: "Your next step" block (spec §3) from config/next-steps.ts, showing the existing
  AI `upsell` paragraph next to the routed main button + secondary link. Same block in the PDF,
  with a clickable link (it currently prints plain "nexterlaw.com").
- Split consent into two checkboxes, add Lead.marketingConsent(+At), working privacy link from config.
- Copy fixes: "5 firm details" (page.tsx ~l.511), "30–60 seconds" (~l.1152), "No sales call".
- Form fixes: whole tile clickable for checkboxes, errors clear on fix, website URL validation.
- System prompt: add the "Not sure = unknown, never absent" rule (spec §4.3).
- isTest flag (spec §5). Check the email base URL matches the live domain.
- Export all REGULATORY_GUIDANCE and RISK_LIBRARY KB entries to docs/KB-REVIEW.md as a table
  (title, text, source reference, suspected issue) for my review. Do not edit them yourself.

Phase 3 — Trustworthy reports
- content/approved-references.ts + reference check after generation + retry/fallback (spec §4.2);
  record the check's results in GeneratedReport.validationPassed / validationErrors.
- New output fields: quickWins, intakeNote, plan90Day (spec §4.4). Save the prompt version.
- Show the instant score and send the full report by email if generation fails or takes over 120 s.
- Scoring: fix the weighting (weights currently cancel out) OR remove it, per my decision in
  OPEN-DECISIONS. Remove the duplicated BAND_META.
- Model comparison script: run 10 seeded firms through the current and a faster model and
  save both outputs to docs/model-comparison/ for my review. No production calls.

Phase 4 — New flow and Global path
- Split page.tsx into one component per step.
- New order: questions → intake questions → details → consent (spec §2). Intake Opportunity rating.
- Firm size option SOLE ("Just me"); city optional; free-email warning.
- Mobile one-question-per-screen with progress bar; honest building screen.
- Global path per spec §2: instant score + confirmation with due date, acknowledgement email,
  AWAITING_REVIEW status, AI draft from content/jurisdictions/, /admin/global review-edit-approve
  screen (behind Clerk), approved report delivered via /r/{token}. Waitlist switch, off by default.

Phase 5 — Results page, CRM, analytics
- /r/{token} results page with the full section order (spec §2), email-me and copy-link buttons.
- GoHighLevel sync (spec §5) using the GHL_* env vars, built against a mock; real calls only after GO.
- Follow-up emails per my decision (GoHighLevel, or schedule the existing day-3/day-7 emails).
- Analytics events (spec §6), no personal data.

Phase 6 — Polish and proof
- Landing trust block, sample-report link (placeholder asset), footer privacy link.
- Accessibility pass (WCAG 2.2 AA), mobile from 360 px, Lighthouse targets.
- Vitest (scoring, intake rating, routing table, reference check) + Playwright (UK, Global,
  consent, /r/{token} reload).
- Benchmark block built but hidden until ≥30 completed submissions in a size band.
- Final report: screenshots of every screen (desktop + mobile), open [CONFIRM] items, deploy
  checklist (migrations, env vars to add, rollback). Do not deploy.
```

---

## What to check after each phase (for Siamak)

| Phase | Check on the preview link |
|---|---|
| 0 | Is the live (Global) code in the repo? Does the plan match the spec? |
| 1 | Logged out: /admin and the CSV export are blocked. Logged in as admin: they work |
| 2 | Test run → clear next step on screen and in the PDF; two tick boxes; working privacy link. Review KB-REVIEW.md |
| 3 | Read 3 sample reports (one per band): every reference correct; Not sure described as unknown; compare model outputs |
| 4 | Finish on your phone in under 4 minutes; run a Global test → confirmation screen, then approve it in /admin/global |
| 5 | Test lead in a GoHighLevel test pipeline with the right tags; emailed link opens the results page |
| 6 | Looks premium on desktop and mobile; Lighthouse targets met |

## Have ready
- The deployed code in the repo (Global path)
- Answers to the 12 decisions in spec §8 (placeholders are fine to start)
- Clerk admin users; a GoHighLevel test sub-account or pipeline + field/tag list (Parastoo)
- Booking, Skool, course and webinar URLs; privacy notice URL
- A solicitor (or you) to review the knowledge-base references
