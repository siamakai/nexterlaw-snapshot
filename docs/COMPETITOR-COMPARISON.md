# Snapshot v2: comparable products and what to borrow

Researched 4 Nov 2026 (web research only, no sign-ups or form submissions). None of the conversion numbers below are independently verified; treat them as vendor claims.

## Products compared

| # | Product | Questions / time | Scale | Results | Gate & next step |
|---|---|---|---|---|---|
| 1 | **Solicitor News – AI Compliance Readiness Score** (UK) — https://solicitornews.co.uk/ai-compliance-readiness-score/ | 40 questions, ~8 min | not stated | Mapped to SRA, UK GDPR, confidentiality, oversight, hallucination controls, vendor due diligence. Sister SRA tool gives score, risk rating, action plan and size benchmarks | Free, no account. **Closest UK competitor**; sells on regulatory grounding |
| 2 | **Vable – AI readiness diagnostic** (legal) — https://www.vable.com/blog/whats-your-firms-ai-readiness-score | 6 questions, ~1 min, 3 "foundations" | single choice | Instant on-screen snapshot benchmarked against Vable's own 160-firm survey | Email unlocks fuller breakdown + webinar recording + industry report ("one form, three things back"); CTA demo |
| 3 | **ibl.ai – AI Readiness Assessment for Legal** (US) — https://ibl.ai/solutions/legal/ai-readiness-assessment | 5 qualifying questions (size, tools, barrier, deployment, timeline) | single choice | Score /25, 3 named tiers, 3 next steps each, answer summary, retake link | No gate for result; contact asked only for optional "personalised roadmap" |
| 4 | **Thomson Reuters – "How prepared is your law firm for AI?"** — https://legal.thomsonreuters.com/en/insights/white-papers/how-prepared-is-your-law-firm-for-ai-integration/form | none (gated white paper + checklist) | – | Static PDF | Gated download. No scored tool found from Clio, LexisNexis or the Law Society (E&W) |
| 5 | **Cisco AI Readiness Index** — https://www.cisco.com/c/m/en_us/solutions/ai/readiness-index/assessment-tool.html | 6 weighted pillars; user picks which to assess | multiple choice | Per-pillar score, 4 named tiers with **published cut-offs**, global distribution, country selector | Social share buttons; no sales CTA |
| 6 | **Microsoft AI Readiness Assessment** — https://learn.microsoft.com/en-us/assessments/94f1c697-9ba7-4d47-ad83-7c6bd94b1505/ | 7 pillars, ~45 min | multiple choice / multi-response | Personalised guidance; "follow recommendations to raise your score" (retake loop) | Sign-in optional |
| 7 | **BlockSurvey – AI Governance Maturity Scorecard** — https://blocksurvey.io/ai-tools/ai-governance-maturity-scorecard | org name + industry, 5 questions | **Yes / Partial / No** | Rating per area, top gaps, next steps; mapped to NIST AI RMF GOVERN + ISO/IEC 42001; says "advisory, not an audit" | Editable Word or PDF export, no sign-up |
| 8 | **Verifywise / Burns Media NIST AI RMF gap tools** — https://verifywise.ai/tools · https://burns-media.pages.dev/ai-governance/tools/nist-ai-rmf-gap/ | 20–40+ | maturity scale | Per-function maturity + prioritised gaps | – |
| 9 | **ScoreApp** (scorecard platform) — https://www.scoreapp.com/?p=2113 | – | – | Score-dependent results copy; dynamic PDF incl. highest/lowest category pages; unique result URL per respondent | Ideal-fit → "speak to someone", others → nurture. Case study claims 80% completion (self-reported) |
| 10 | **Outgrow / Uplup** (gate placement) — https://intercom.help/outgrow/en/articles/575989-lead-generation · https://uplup.com/docs/quiz-lead-capture | – | – | – | Form after last question, before results. Required gate = more leads, more drop-off; skippable = the reverse |

## Where the Snapshot already wins
- **Depth of output:** an AI-written, firm-specific report (practice areas, size, EU exposure) beats every comparator's templated tiers.
- **UK regulatory angle + Global by hand:** only Solicitor News competes on the UK regulatory angle, and none offer a human-reviewed international version.
- **A named framework (CLEAR TRUST):** easier to remember and talk about than generic "pillars".

## What v2 should borrow (prioritised)

Status: **Planned** = already in SNAPSHOT-V2-SPEC.md · **New** = proposed here, needs Siamak's OK (see OPEN-DECISIONS.md).

| # | Idea | Seen at | Effort | Status | Why |
|---|---|---|---|---|---|
| 1 | Questions first; form after the last question, before results | Outgrow, ScoreApp, Vable | S | Planned | Sunk effort lifts form completion |
| 2 | **Show score + band on screen before the form; the form unlocks the full AI report, PDF and 90-day plan** ("one form, three things back") | Vable, ibl.ai, Cisco | S | **New (changes spec §2)** | Gives value first; raises the perceived worth of the email trade |
| 3 | Route the CTA by score and fit | ScoreApp, ibl.ai | M | Planned (§3) | Calls go to firms worth the time |
| 4 | Two more qualifying intake questions: timeline and biggest barrier | ibl.ai, BlockSurvey | S | **New** (extends §2 intake) | The strongest buying signals; sharpen the report |
| 5 | Each dimension shows the rule it maps to (SRA / UK GDPR / EU AI Act) + "advisory, not an audit" line | Solicitor News, BlockSurvey | S–M | Partly planned (§4 references) | Lawyers trust cited rules; answers the direct UK competitor. **Only from the approved reference list** |
| 6 | Top 3 gaps on screen, each with one action | ibl.ai, BlockSurvey, ScoreApp | S | Planned as "3 quick wins" | Value before the pitch |
| 7 | Publish band cut-offs + real distribution with sample size | Cisco | S | **New** | Makes the score feel rigorous |
| 8 | Peer benchmarks by size / practice / path | Vable, Solicitor News | M–L | Planned (hidden until ≥30 per band) | Social proof |
| 9 | Shareable result link + LinkedIn share | ScoreApp, Cisco | M | Planned (`/r/{token}`); LinkedIn share **New** | Partners forward it; spreads the tool |
| 10 | "Partly / in progress" answer | BlockSurvey | S | Behind a flag (spec §2) | Fairer scoring. Spec keeps Yes/Not sure/No for v2; keep it that way |
| 11 | "Raise your score" retake loop: 90-day reminder + before/after comparison | Microsoft, ibl.ai | S–M | Partly planned (retake reminder) | Re-engages leads; fits Skool nurture |
| 12 | Editable Word starter AI-use policy download | BlockSurvey | M | **New** (later; needs legal review of the template) | Lasting value inside the firm; leads to courses |
| 13 | Short eligibility check before the calendar | ScoreApp | S | **New** (or do it in GoHighLevel booking form) | Screens poor-fit calls |
| 14 | Optional deep-dive on one dimension | Cisco, Microsoft | M | **New** (post-v2) | Longer path for engaged leads without lengthening the core |
| 15 | Team mode (partner vs staff answers) | none verified | L | **New** (post-v2, speculative) | Lowest priority |

Gaps: the Law Society of Ireland "AI Workflow Readiness Diagnostic" PDF could not be read.
