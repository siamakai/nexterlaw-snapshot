# Open decisions

Placeholders in code will point here. ✅ = decided, ⏳ = open.

## Urgent (before any code ships)
| # | Decision | Status |
|---|---|---|
| U1 | Developer checks **today** whether `/admin/submissions`, `/admin/knowledge-base`, `/api/admin/submissions/csv` and `/api/admin/kb` are open on the live site. If yes: take them down/protect now, and assess whether a UK GDPR breach notification is needed | ⏳ |
| U2 | Where is the deployed code? → `github.com/siamakai/nexterlaw-snapshot` `main` @ `f85df8a` (found via Vercel, 4 Nov) | ✅ |
| U2b | Ali's repo (`alisadri1985-max/nexterlaw-snapshot`) is 3 commits behind. Archive it, or keep it in sync? Make sure nobody deploys from it | ⏳ |
| U3 | Hosting is Vercel. Delete the Netlify function and `netlify.toml`? | ⏳ |
| U5 | Global: the live code deliberately shows **no score**; the spec wants an instant score. Which? (V2-PLAN C9) | ⏳ |
| U4 | Who can access the Google Sheet with firm names + emails; does the privacy notice cover it? | ⏳ |

## From spec §8
| # | Decision | Status |
|---|---|---|
| 1 | Admin pages reachable without login? (= U1) | ⏳ |
| 2 | Where is the deployed code? (= U2) | ✅ |
| 3 | Score weighting: fix it (true weighted mean) or drop it (simple average) | ⏳ |
| 4 | Rename "Rights" → "Rights & Confidentiality"; keep Yes / Not sure / No for v2 | ⏳ |
| 5 | Intake Opportunity thresholds; add "Just me" (`SOLE`) size option | ⏳ |
| 6 | Default brand for 2–20 staff with no intake gap (Agency or NexterLaw) | ⏳ |
| 7 | Global: who reviews/approves; first countries for jurisdiction notes | ⏳ |
| 8 | Privacy notice URL and consent wording | ⏳ |
| 9 | Booking links (Calendly or GHL calendars), Skool, course, webinar URLs | ⏳ |
| 10 | Follow-up emails in the app (day 3/7) or GoHighLevel (spec recommends GHL) | ⏳ |
| 11 | Who reviews the KB references, by when | ⏳ |
| 12 | Report model: Opus vs faster, after the comparison (the comparison itself costs API calls; needs GO) | ⏳ |

## New from Phase 0
| # | Decision | Status |
|---|---|---|
| N1 | Show score + band **before** the details form (P1)? Or keep the form before results as in the spec | ⏳ |
| N2 | Add "timeline" and "biggest barrier" intake questions (P2)? | ⏳ |
| N3 | Day-0 email comes from `no-reply@` but says "reply to this email". Real reply-to address, or drop the line? | ⏳ |
| N4 | EU layer currently triggers on EU = "Not sure" as well as "Yes". Keep? | ⏳ |
| N5 | If Upstash is unreachable, rate limiter fails open (site works) or closed (site blocks)? Recommended: open + alert | ⏳ |
| N6 | Contact address on the failure message (currently a personal agency email) | ⏳ |
| N7 | Which proposals P3–P10 in V2-PLAN.md to include | ⏳ |
| N8 | Lead records: keep one per email (overwritten today) or one per submission? | ⏳ |
