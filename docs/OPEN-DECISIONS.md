# Open decisions

Updated 8 Nov 2026 after the v2 build. ✅ = decided · 🔧 = built with a **default** you can change by config (no code change) · ⏳ = open.
Where a default was needed to finish the build, it follows the spec's recommendation or the safest option, and the setting to change it is named.

## Urgent (before deploying)
| # | Decision | Status |
|---|---|---|
| U1 | Are the admin pages and CSV exports open on the live site **today**? If yes, block `/admin` and `/api/admin` in Vercel Firewall now and assess whether a UK GDPR breach notification is needed | ⏳ |
| U2 | Where is the deployed code? → `siamakai/nexterlaw-snapshot` `main` | ✅ |
| U2b | Ali's older copy of the repo: archive it so nobody deploys from it | ⏳ |
| U3 | Vercel's Git link showed "Project Link not found" on 4 Nov: grant the Vercel GitHub app access to the repo, or no push deploys | ⏳ |
| U4 | Google Sheet "API Usage" holds firm names and emails: who can see it, and does the privacy notice cover it? (Test submissions are no longer logged there) | ⏳ |
| U5 | Global instant score: live code showed none; spec wants it | 🔧 Shown, with a caption saying it is general, not country-specific. Hide with `NEXT_PUBLIC_GLOBAL_SHOW_SCORE=false` |

## From spec §8
| # | Decision | Status |
|---|---|---|
| 1 | Admin pages reachable without login? (= U1) | ⏳ |
| 2 | Where is the deployed code? | ✅ |
| 3 | Score weighting | 🔧 Removed: it cancelled out, so scores are identical to before. A true weighted mean can be added in `src/lib/scoring.ts` |
| 4 | Rename "Rights" → "Rights & Confidentiality"; keep Yes / Not sure / No | 🔧 Name unchanged; switch with `NEXT_PUBLIC_RENAME_RIGHTS=true`. Answer scale kept at three |
| 5 | Intake Opportunity thresholds; "Just me" size | 🔧 Spec thresholds (`src/lib/intake.ts`); `SOLE` = "Just me" added, MICRO relabelled "2–4" |
| 6 | Brand for 2–20 staff with no intake gap | 🔧 Nexter AI Agency (`src/config/next-steps.ts`, one line) |
| 7 | Global: who reviews/approves; first countries for notes | ⏳ Review screen built (`/admin/global-submissions/[id]`); notes go in `content/jurisdictions/index.ts` (empty) |
| 8 | Privacy notice URL and consent wording | ⏳ Set `NEXT_PUBLIC_PRIVACY_URL`; until then the link opens an email to services@nexterai.agency. Consent wording is the spec's |
| 9 | Booking, Skool, course, webinar URLs | ⏳ Set the `NEXT_STEP_*` and `RESOURCE_*` env vars (see V2-REPORT). Unset links open an email instead of breaking |
| 10 | Follow-ups: in the app or GoHighLevel | 🔧 GoHighLevel (spec recommendation): CRM tags carry everything a workflow needs. Day-3/7 emails remain written but unscheduled |
| 11 | Who reviews the KB references, by when | ⏳ `docs/KB-REVIEW.md` is ready (35 entries). Until references are approved, reports name instruments without pinpoint numbers |
| 12 | Report model | ⏳ `scripts/compare-models.ts` written, **not run** (paid calls). Switch later with `REPORT_MODEL` |

## New from Phase 0 and the build
| # | Decision | Status |
|---|---|---|
| N1 | Show score before the details form | ⏳ Not built (spec order kept: questions → intake → details → results). Easy to add later |
| N2 | Extra intake questions (timeline, biggest barrier) | ⏳ Not built |
| N3 | "Reply to this email" from a no-reply address | 🔧 Reply-to is now services@nexterai.agency. Override the sender with `RESEND_FROM_ADDRESS` / `RESEND_FROM_NAME` |
| N4 | EU AI Act content when EU = "Not sure" | ⏳ Unchanged (included). Routing treats only "Yes" as EU |
| N5 | Rate limiter when Upstash is down | 🔧 Fails open and logs |
| N6 | Contact address on error messages | 🔧 services@nexterai.agency |
| N7 | Proposals P3–P10 | ⏳ Not built, except: phone layout fixes, and showing the score early on the building screen |
| N8 | One Lead per email or per submission | ⏳ Unchanged (one per email, latest details win; consent reflects the latest choice) |
| N9 | EU question optional (spec) vs required | 🔧 Kept **required**: leaving it blank would silently add or drop EU AI Act content |
| N10 | GoHighLevel: webhook or API; field and pipeline names | 🔧 Webhook (`GHL_WEBHOOK_URL`), mock until `GHL_MODE=live`. Tags and fields listed in V2-REPORT for Parastoo |
| N11 | Analytics provider | ⏳ Events fire to Google Tag Manager or Plausible if installed; none is installed yet |
| N12 | Sample report (fictional firm) and creator photo for the trust block | ⏳ Set `NEXT_PUBLIC_SAMPLE_REPORT_URL` / `NEXT_PUBLIC_CREATOR_PHOTO_URL`; hidden or monogram until then |
| N13 | `KnowledgeBaseEntry.lastReviewedDate` is stamped automatically on seed/edit, so it doesn't show a legal review happened. Track real reviews in KB-REVIEW.md, or add a reviewer field | ⏳ |
