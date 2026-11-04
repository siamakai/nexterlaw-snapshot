# AI Readiness Snapshot v2: Redesign Spec

Owner: Dr Siamak Goudarzi · Drafted by Claude · 4 Nov 2026 · v2 of the draft (updated after reading the repo)
Live app: https://snapshotapp.nexterlaw.com/
Repo: https://github.com/alisadri1985-max/nexterlaw-snapshot (`main` @ `264fcd9`, 2 Sep 2026)
Items marked `[CONFIRM]` need Siamak's decision.

---

## 0. Read this first: what the repo shows

### 0.1 The repo is behind the live app
The live app has a **UK / Global choice** and a **5-step Global path** (country dropdown, report by hand within 48 hours). **Neither exists in `main`.** The repo has one commit (2 Sep) and its flow goes straight from the landing page to the firm details form. The live code is therefore somewhere else: another branch, another repo, or changes that were never pushed. **Get the code that is actually deployed into this repo before any work starts** (Phase 0).

### 0.2 Urgent security and privacy issues (if the live app matches `main`)
1. **The admin area has no login.** `/admin/submissions` and `/admin/knowledge-base` have no auth check, and there is no `middleware.ts`. Clerk is installed and has env vars, but it isn't wired up.
2. **`GET /api/admin/submissions/csv` returns every lead's firm name, email, city, country and scores to anyone who calls it.** That is a potential UK GDPR personal-data exposure.
3. **`/api/admin/kb` (and `/[id]`) lets anyone create or edit knowledge-base entries**, i.e. change what the AI tells law firms.
4. **The background function `/.netlify/functions/generate-report-background` is open.** Anyone can trigger report regeneration: Claude Opus costs plus repeat emails.
5. **There's no rate limiting.** Upstash is installed but unused, so `/api/submit` can be spammed, and each call triggers a paid Opus generation.
6. Google Sheets logging (`appendUsageRow`) writes **firm name and email** into a spreadsheet. Check who can access it, and whether the privacy notice covers it.

Claude did **not** test these on the live site; probing them would mean accessing other people's data. Have the developer check whether they're live **today**. If items 1–3 are live, fix them before anything else and consider whether a data-breach assessment is needed. `[CONFIRM]`

### 0.3 Other findings that change the plan
| Finding | Where | Effect on the plan |
|---|---|---|
| **The wrong SRA references are in the knowledge base, not made up by the AI.** The prompt already restricts the AI to KB entries. The wrong references are in `knowledge-base-seed.ts`: "SRA Principle 7 and Code para 4.2" (supervision), "SRA Rule 6" (confidentiality), "SRA Standards and Regulations, para 3.2", "Rule 8.6 (information about costs)" for AI disclosure | `src/lib/knowledge-base-seed.ts` + the `KnowledgeBaseEntry` table | Fix = **Siamak/a solicitor reviews every REGULATORY_GUIDANCE entry**; then a check that only lets through references on an approved list |
| **The score weighting has no effect.** Size and sensitivity weights multiply both the score and the maximum, so they cancel out. The headline is a plain average. The `ScoringRule` and `ScoreBand` tables ("configurable in admin, never hard-coded") aren't used; scoring is hard-coded | `src/lib/scoring.ts`, `constants.ts` | Decide whether weighting is wanted; if so, implement it properly (weighted average) and read it from the DB |
| Score bands already exist: **Exposed 0–39 · Developing 40–69 · In Control 70–100** | `constants.ts` + `ScoreBandLabel` enum | Keep these (the earlier draft proposed new ones; dropped) |
| **The AI already writes a tailored next-step paragraph (`upsell`), but the web results page never shows it.** The PDF shows it with the plain text "nexterlaw.com" and no link | `page.tsx`, `pdf-template.tsx` | Reuse it: show it on the results page next to the routed button |
| The day-0 email has a "book a consultation" link from `CALENDLY_BOOKING_URL`. If that isn't set, the link is `#` | `email.ts` | Check the env value; move booking links into the next-step config |
| **The day-3 and day-7 follow-up emails are written but never sent** (nothing schedules them; `EmailLog` isn't written) | `email.ts` | Wire them up through a scheduled job, or hand follow-ups to GoHighLevel. Not both |
| **GoHighLevel env vars exist (`GHL_WEBHOOK_URL`, `GHL_API_KEY`) but there's no code.** `Lead.crmTagged` is never set | `env.ts`, schema | Build the sync |
| The `PromptTemplate` and `EmailTemplate` tables aren't used; prompts and emails are hard-coded | schema vs `report-generator.ts`, `email.ts` | Fine for now; note it |
| The email base URL defaults to `snapshot.nexterlaw.com`, but the live domain is `snapshotapp.nexterlaw.com` | `email.ts` | Check `NEXT_PUBLIC_APP_URL` is set in production, or email links break |
| Report model is `claude-opus-4-8` with `max_tokens` 16000, which explains the ~90 s wait | `report-generator.ts` | Test a faster model on the same 10 sample firms; keep Opus if it's clearly better `[CONFIRM]` |
| Consent: one combined tick box; the privacy link is `href="#"`. `privacyVersion` is stored, but there's no marketing-consent field | `page.tsx` l.950–957, schema | Split the consent and store both |
| The landing page says "5 firm details" (l.511); processing says "30–60 seconds" (l.1152) | `page.tsx` | Fix the copy |
| Hosting: `netlify.toml` + a Netlify background function (and an unused-looking `vercel.json`) | root | Netlify assumed `[CONFIRM]` |
| `page.tsx` is one ~1,400-line client component holding every step | `src/app/page.tsx` | Split into one component per step during v2 |

---

## 1. Why we're redesigning

The Snapshot is Nexter's qualifying tool (Podcast/LinkedIn → Webinar → **Snapshot** → Skool → retainer). The report is already strong. The problem is that it's a dead end: a firm gets a good report and has nowhere to go next. v2 makes it **the main lead engine for both brands**:
- **Nexter AI Agency:** firms with 2–20 staff that have intake gaps
- **NexterLaw:** governance advisory for firms of 21+ staff, or with EU exposure or a high-risk profile, plus Global firms
- **Skool / courses:** sole practitioners and firms not ready to buy
- **Webinars:** everyone

Success measures (track from day one): landing → finished Snapshot ≥ 35% · finished → next-step click ≥ 25% · finished → call booked ≥ 10% · time to report ≤ 60 s, and the copy says so.

---

## 2. New flow

### UK path
```
Landing → Where are you based? → 10 CLEAR TRUST questions → 4 client-intake questions
→ About your firm + consent → Building → Results at /r/{token} (+ PDF, + emailed link)
```
The questions come before the form, because people who have already invested time are more likely to finish it.

### Global path (keep: by hand, 48 hours; confirmed 4 Nov 2026)
Same steps as UK, then a **confirmation screen** instead of an instant report:
1. Show the **instant CLEAR TRUST score** straight away, plus "Your full Global Snapshot for {country} will arrive by {due date/time in the firm's time zone}."
2. Send an acknowledgement email.
3. Create a GoHighLevel opportunity in a **"Global Snapshot" pipeline** with a 48-hour due date and a reminder at 36 hours (tags `snapshot-global`, `country-{x}`).
4. **AI first draft for review:** the app drafts the report using the firm's answers + `content/jurisdictions/{country}` notes (start with the most frequent countries). A team member reviews, edits and **approves** it in a new admin screen (`/admin/global`, behind login). Nothing is sent without approval.
5. Delivery uses the same `/r/{token}` page + PDF + email + next-step routing.
6. Waitlist switch (off by default) for when the team is overloaded.
Extra fields: country dropdown (already live) + optional state/region for federal countries.
`[CONFIRM: who owns and approves Global reports; first countries to write notes for]`

### Screen details

**Landing**
- Keep the headline and the CLEAR TRUST explainer.
- Step cards: "10 questions · 4 details · Instant PDF report" (UK).
- Strapline: replace "No sales call" with **"Free · No obligation"**.
- **Trust block:** Siamak's photo, plus "Created by Dr Siamak Goudarzi, former judge and former managing partner of UK law firms", plus a sample-report link (fictional firm) `[CONFIRM]`.
- Footer: a working privacy link.
- Brand line: "CLEAR TRUST is a NexterLaw framework · A Nexter AI Group service" `[CONFIRM]`.

**10 CLEAR TRUST questions**
- Keep the wording from `constants.ts`.
- Rename dimension 5 from **"Rights" to "Rights & Confidentiality"** (the question and description are about confidentiality) `[CONFIRM]`.
- Answers stay **Yes / Not sure / No** in v2 (it avoids an enum migration and keeps past results comparable). A 4-point scale goes behind a config flag for later `[CONFIRM]`.
- Mobile: one question per screen with a progress bar. Desktop: all ten at once.

**4 client-intake questions (new; not part of the CLEAR TRUST score)**
1. What happens to new enquiries outside office hours? (Voicemail/email only · Answering service · Someone on call · Automated/AI intake · Not sure)
2. How quickly do you usually reply to a new enquiry? (Under 5 min · Within an hour · Same day · Next day or later · Not sure)
3. Roughly how many new enquiries a month? (Under 20 · 20–50 · 50–150 · 150+ · Not sure)
4. Which case-management system do you use? (Clio · LEAP · Other · None/spreadsheets · Not sure)

These produce an **Intake Opportunity rating**:
- **High:** out of hours = voicemail/email only, OR reply = next day or later, OR (≥ 50 enquiries/month AND reply ≥ same day)
- **Low:** automated intake already in place AND reply under an hour
- **Medium:** everything else
`[CONFIRM thresholds]`

**About your firm (moved to the end)**
- Required: firm name, practice area(s), firm size, work email.
- Optional: website (validate it if filled in), EU question.
- Drop city on the UK path (make `Lead.city` optional).
- Firm size: add a new **`SOLE` = "Just me"** option and relabel MICRO as **"2–4"**, so sole practitioners route to Skool. Other bands stay the same `[CONFIRM]`.
- Free email domains: **warn, don't block** (the `FREE_EMAIL_DOMAINS` list already exists).
- **Consent, two separate tick boxes:**
  - (required) "I understand this Snapshot is general information, not legal or regulatory advice."
  - (optional, unticked) "Contact me about my results and related services." + working privacy link
  - Store both with a timestamp and `privacyVersion`.

**Building screen**
- Honest stage text; say "about a minute".
- Poll `/api/report/[id]` as now.
- On failure or timeout over 120 s: show the score (it's calculated without AI) and say "Your full report will arrive by email". The submission is kept.

**Results page at `/r/{token}`**
- Use a random, unguessable token separate from the cuid.
- The page survives a reload and can be shared with a partner.

Order, top to bottom:
1. Score ring + band (existing bands), plus "What moves you to the next band".
2. **Your next step:** one main button from §3 + the AI `upsell` paragraph + one secondary link.
3. 10 dimension bars; Not sure is shown in grey and labelled "Unknown".
4. Score summary.
5. **3 quick wins** (new section in the AI output).
6. Exposures (existing).
7. **Client intake opportunity** (new): 2–3 sentences + rating.
8. Regulatory map (existing, references checked).
9. Shadow AI (existing).
10. Opportunities (existing; practice-specific; keep).
11. **90-day plan:** 3 steps, each linked to a course, Skool lesson, podcast episode or webinar recording, from a config list.
12. Compare-with-similar-firms block: built now, shown once ≥ 30 completed submissions exist in that size band.
13. Disclaimer, plus an optional "Retake in 3 months" reminder.

Buttons: Download PDF · Email me this report · Copy link. **The PDF gets the same next-step block with a clickable link.**

---

## 3. Next-step routing (one main button + one secondary link)

| Situation (first match wins) | Main button | Brand | Secondary |
|---|---|---|---|
| Global path | "We'll be in touch within 48 hours" + "Register for the next webinar" | NexterLaw | Skool |
| Firm size 21+ **or** (EU = Yes **and** band = Exposed/Developing) | "Book a governance review call" | NexterLaw | Next webinar |
| Firm size 2–20 **and** Intake Opportunity = High | "Book a free 20-minute intake review" | Nexter AI Agency | Next webinar |
| Firm size 2–20 (all others) | "Book a free Snapshot review call" | Agency `[CONFIRM: or NexterLaw]` | Skool |
| Just me | "Join the Nexter AI Business Club" | Skool | AI & Law course |

- All links live in `config/next-steps.ts`: booking calendars, webinar, Skool, courses. Later they can move into the DB so they can be edited in admin.
- Track every click and save it against the submission.
- **Show no prices.**

---

## 4. Report quality rules

1. **Knowledge-base review.** Export every `REGULATORY_GUIDANCE` and `RISK_LIBRARY` entry for Siamak (or a solicitor) to check. Wording that must be checked, as a minimum:
   - "SRA Principle 7 and Code para 4.2" for supervision
   - "SRA Rule 6" / "Rule 6.3"
   - "SRA Standards and Regulations, para 3.2"
   - "Rule 8.6 (information about costs)" for AI disclosure
   - every "Principle 4" use

   Mark each entry with `lastReviewedDate` and the reviewer.
2. **Approved reference list + check.** Create `content/approved-references.ts` (id, exact reference text, URL). After generation, scan the report for SRA/GDPR/Principle/Code/Rule/para references. If any isn't on the approved list, regenerate (up to 2 times), then fall back to wording with the reference removed. Record what the check found in the existing fields `GeneratedReport.validationPassed` / `validationErrors`, which are currently always set to `true` / empty.
3. **Not sure = unknown.** Add to the system prompt: "Where an answer is Not sure, describe it as uncertainty to be checked; never state that the control does not exist." The prompt currently passes the answers but doesn't say this.
4. **New output fields** in the tool schema: `quickWins[3]`, `intakeNote`, `plan90Day[3]` (each step picks an id from the resources list in the config). Keep the existing fields.
5. Save the prompt version with every report (`PromptTemplate.version`, or a constant).
6. Model: run the same 10 test firms through the current model and a faster one. Choose on quality first, then speed `[CONFIRM]`.

---

## 5. Data, CRM, email

- **Schema changes (additive only; Prisma migrations):**
  - Submission: `path` (UK | GLOBAL), intake answers, `intakeRating`, `route`, `nextStepClickedAt`, `resultToken`, `isTest`, `promptVersion`
  - Lead: `marketingConsent`, `marketingConsentAt`, `stateRegion`; `city` becomes optional
  - Enum: FirmSizeBand + `SOLE`; SubmissionStatus + `AWAITING_REVIEW` (Global)
- **GoHighLevel sync** (uses the existing `GHL_*` env vars).
  - Create or update the contact.
  - Tags: `snapshot-v2`, `band-{x}`, `size-{x}`, `intake-{x}`, `eu-{x}`, `route-{x}`, `path-{uk|global}`.
  - Custom fields: score, results link. Set `Lead.crmTagged`.
  - Add marketing tags only when there is marketing consent.
  - Skip when `isTest`.
  - `[CONFIRM: API vs webhook; field names (Parastoo's workflow list)]`
- **Follow-up emails:** choose one route `[CONFIRM]`:
  - (a) Send the existing day-3 and day-7 emails via a scheduled function and log them in `EmailLog`.
  - (b) Hand all follow-up to GoHighLevel workflows and keep only the day-0 report email in the app.

  Recommended: (b), so all nurture lives in one place.
- **Test submissions:** an email ending `@example.com` or a firm name starting `ZZ TEST` sets `isTest`; no CRM sync or follow-ups. Delete or flag the 4 Nov test lead: "ZZ TEST Nexter QA Firm (fake)", qa-test@example.com.

---

## 6. Analytics, accessibility, quality

- **Events:** `landing_view`, `start_click`, `path_selected`, `q_answered`, `intake_completed`, `details_submitted`, `report_ready`, `report_failed`, `next_step_click`, `pdf_download`, `share_click`, `email_report`. No personal data in events or URLs.
- **Accessibility:** WCAG 2.2 AA; whole tiles clickable (the live checkboxes only respond to label clicks); errors clear once the field is fixed; works on phones from 360 px wide; landing page Lighthouse scores of Performance ≥ 85 and Accessibility ≥ 95.
- **Tests:** add Vitest for scoring, intake rating, routing (one case per table row) and the reference check. Add Playwright for the UK happy path, Global path, consent rules and reload of `/r/{token}`.
- **Code health:** split `page.tsx` into one component per step. Remove duplicated band data: `BAND_META` is defined in three files. Remove the score weighting that doesn't work, or fix it.

---

## 7. Out of scope for v2
Paid tiers, user accounts, CLEAR TRUST certification (not live), accountancy vertical (the schema allows for it; leave dormant), multi-language.

## 8. Decisions needed from Siamak
1. **Today:** are the admin pages and the CSV export reachable without login on the live site? (Developer to check.)
2. Where is the deployed code (Global path)? Get it into this repo.
3. Score weighting: fix it, or drop it and keep a simple average?
4. Rename "Rights" to "Rights & Confidentiality"? Keep Yes/Not sure/No for v2?
5. Intake Opportunity thresholds; add the "Just me" size option
6. Default brand for firms of 2–20 staff with no intake gap
7. Global: who reviews and approves reports; first countries for notes
8. Privacy notice URL and consent wording
9. Booking links (Calendly or GHL calendars?), Skool, course, webinar URLs
10. Follow-up emails: in the app (day 3/7) or in GoHighLevel
11. Who reviews the knowledge-base references, and by when
12. Report model: Opus vs a faster model, after the comparison test
