import { Resend } from 'resend';
import type { ClearTrustScores } from '@/types';
import type { ResolvedNextStep } from '@/config/next-steps';
import { SITE } from '@/config/site';
import { escapeHtml } from '@/lib/security/tokens';
import { absoluteUrl } from '@/lib/urls';
import type { GlobalSubmission } from '@prisma/client';
import { CLEAR_TRUST_DIMENSIONS, type DimensionKey } from '@/lib/constants';
import { GLOBAL_QUESTION_OVERRIDES } from '@/lib/global-questions';
import { GLOBAL_FIRM_SIZE_OPTIONS, GLOBAL_PRACTICE_AREAS } from '@/lib/global-jurisdictions';
import { INTAKE_QUESTIONS, INTAKE_RATING_LABEL, intakeLabel, type IntakeRating } from '@/lib/intake';

// Sender: emails go out as "Nexter AI Agency" from the verified mail.nexterai.agency
// domain (decided 10 Nov 2026). RESEND_FROM_NAME / RESEND_FROM_ADDRESS override if set.
// Replies go to services@nexterai.agency, so "reply to this email" reaches a person.
const FROM_NAME = (process.env.RESEND_FROM_NAME ?? '').trim() || 'Nexter AI Agency';
const FROM_EMAIL = (process.env.RESEND_FROM_ADDRESS ?? '').trim() || 'snapshot@mail.nexterai.agency';
const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;
const REPLY_TO = SITE.replyToEmail;

const NAVY = '#1a3a6b';
const GOLD = '#B8902A';

function send(opts: { to: string | string[]; subject: string; html: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({ from: FROM_ADDRESS, replyTo: REPLY_TO, ...opts });
}

function shell(eyebrow: string, heading: string, body: string, footer = true): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #d1d9e6;">
      <tr><td style="background:${NAVY};padding:28px 40px;">
        <p style="margin:0;color:#ffffff;font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;">${eyebrow}</p>
        <h1 style="margin:10px 0 0;color:#ffffff;font-size:21px;font-weight:700;line-height:1.3;">${heading}</h1>
      </td></tr>
      <tr><td style="padding:30px 40px;">${body}</td></tr>
      ${footer ? `<tr><td style="background:#f4f6fb;padding:18px 40px;border-top:1px solid #d1d9e6;">
        <p style="margin:0;font-size:11px;color:#6b7280;line-height:1.6;">
          This Snapshot is general information, not legal or regulatory advice.<br>
          NexterLaw · <a href="https://nexterlaw.com" style="color:${NAVY};">nexterlaw.com</a> · Questions? Reply to this email.
        </p>
      </td></tr>` : ''}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const p = (text: string) => `<p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">${text}</p>`;
const button = (href: string, label: string, primary = true) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:${primary ? NAVY : '#ffffff'};color:${primary ? '#ffffff' : NAVY};border:1px solid ${NAVY};text-decoration:none;padding:13px 26px;border-radius:6px;font-size:14px;font-weight:600;margin:0 6px 8px 0;">${escapeHtml(label)}</a>`;

function scoreBox(scores: Pick<ClearTrustScores, 'headline' | 'bandDisplayName' | 'bandColour'>, caption = 'Overall score'): string {
  return `<table cellpadding="0" cellspacing="0" style="background:#f4f6fb;border-radius:6px;margin:0 0 22px;border-left:4px solid ${scores.bandColour};">
    <tr><td style="padding:18px 22px;">
      <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(caption)}</p>
      <p style="margin:0 0 2px;font-size:34px;font-weight:700;color:${scores.bandColour};">${Math.round(scores.headline)}</p>
      <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">${escapeHtml(scores.bandDisplayName)}</p>
    </td></tr>
  </table>`;
}

function nextStepBlock(step: ResolvedNextStep | null): string {
  if (!step) return '';
  return `<div style="border-top:1px solid #e5e7eb;margin-top:8px;padding-top:20px;">
    <p style="margin:0 0 10px;font-size:11px;color:${GOLD};text-transform:uppercase;letter-spacing:2px;font-weight:700;">Your next step</p>
    ${step.note ? p(escapeHtml(step.note)) : ''}
    ${button(step.main.href, step.main.label)}
    <p style="margin:6px 0 0;font-size:13px;"><a href="${escapeHtml(step.secondary.href)}" style="color:${NAVY};">${escapeHtml(step.secondary.label)} →</a></p>
  </div>`;
}

// ── UK Day 0: report ready (also used for "Email me this report") ──────────────

export interface SendDay0Options {
  to: string;
  firmName: string;
  scores: ClearTrustScores;
  pdfUrl: string;
  resultsUrl: string | null;
  nextStep: ResolvedNextStep | null;
}

export function day0Html(o: SendDay0Options): string {
  const pdf = absoluteUrl(o.pdfUrl);
  return shell('NexterLaw · AI Readiness Snapshot', 'Your AI Readiness Report is ready', [
    p(`Thank you for completing the CLEAR TRUST AI Readiness Snapshot for <strong>${escapeHtml(o.firmName)}</strong>.`),
    scoreBox(o.scores),
    `<p style="margin:0 0 20px;">${o.resultsUrl ? button(o.resultsUrl, 'View your results') : ''}${button(pdf, 'Download PDF', !o.resultsUrl)}</p>`,
    p('Your report covers the ten CLEAR TRUST dimensions, the regulatory picture for your firm, three quick wins and a 90-day plan.'),
    o.resultsUrl ? p(`You can share <a href="${escapeHtml(o.resultsUrl)}" style="color:${NAVY};">this link</a> with a partner; anyone with the link can view the report.`) : '',
    nextStepBlock(o.nextStep),
  ].join(''));
}

export async function sendDay0Email(o: SendDay0Options) {
  const { data, error } = await send({
    to: o.to,
    subject: `Your AI Readiness Report is ready — ${o.firmName}`,
    html: day0Html(o),
  });
  if (error) throw new Error(`Resend error (Day 0): ${error.message}`);
  return data;
}

// ── Follow-ups (written but not scheduled; OPEN-DECISIONS #10 recommends GoHighLevel) ─

export async function sendDay3Email(o: { to: string; firmName: string; resultsUrl: string }) {
  const { data, error } = await send({
    to: o.to,
    subject: 'Your AI Readiness Report — a quick reminder',
    html: shell('NexterLaw', 'Your report is still available', [
      p(`Three days ago you received your CLEAR TRUST AI Readiness Report for <strong>${escapeHtml(o.firmName)}</strong>.`),
      `<p>${button(o.resultsUrl, 'Open your results')}</p>`,
    ].join('')),
  });
  if (error) throw new Error(`Resend error (Day 3): ${error.message}`);
  return data;
}

export async function sendDay7Email(o: { to: string; firmName: string; nextStep: ResolvedNextStep }) {
  const { data, error } = await send({
    to: o.to,
    subject: 'Strengthen your AI governance with NexterLaw',
    html: shell('NexterLaw', 'One week on', [
      p(`One week has passed since your AI Readiness Snapshot for <strong>${escapeHtml(o.firmName)}</strong>.`),
      nextStepBlock(o.nextStep),
    ].join('')),
  });
  if (error) throw new Error(`Resend error (Day 7): ${error.message}`);
  return data;
}

// ── Global: acknowledgement to the firm, report delivery ──────────────────────

export interface GlobalAckOptions {
  to: string;
  contactName: string;
  country: string;
  dueText: string;
  scores: Pick<ClearTrustScores, 'headline' | 'bandDisplayName' | 'bandColour'> | null;
}

export function globalAckHtml(o: GlobalAckOptions): string {
  return shell('NexterLaw · Global Snapshot', 'We’ve received your assessment', [
    p(`Dear ${escapeHtml(o.contactName)},`),
    p(`Thank you for completing the Global AI Readiness Snapshot. Our team is now researching the rules that apply in <strong>${escapeHtml(o.country)}</strong> and will send your full report by <strong>${escapeHtml(o.dueText)}</strong>.`),
    o.scores ? scoreBox(o.scores, 'Instant CLEAR TRUST score (general practice, not yet country-specific)') : '',
    p('If anything about your firm has changed, or you have a question, just reply to this email.'),
  ].join(''));
}

export async function sendGlobalAcknowledgement(o: GlobalAckOptions) {
  const { data, error } = await send({ to: o.to, subject: 'Your Global AI Readiness Snapshot is in progress', html: globalAckHtml(o) });
  if (error) throw new Error(`Resend error (Global acknowledgement): ${error.message}`);
  return data;
}

export async function sendGlobalReportReady(o: { to: string; contactName: string; firmName: string; resultsUrl: string; nextStep: ResolvedNextStep }) {
  const { data, error } = await send({
    to: o.to,
    subject: `Your Global AI Readiness Report is ready — ${o.firmName}`,
    html: shell('NexterLaw · Global Snapshot', 'Your report is ready', [
      p(`Dear ${escapeHtml(o.contactName)},`),
      p(`Your Global AI Readiness Report for <strong>${escapeHtml(o.firmName)}</strong> has been prepared and reviewed by our team.`),
      `<p style="margin:0 0 20px;">${button(o.resultsUrl, 'View your report')}</p>`,
      nextStepBlock(o.nextStep),
    ].join('')),
  });
  if (error) throw new Error(`Resend error (Global report): ${error.message}`);
  return data;
}

// ── Team emails ────────────────────────────────────────────────────────────────

function teamEmails(): string[] {
  // Comma-separated so more than one team inbox can be notified.
  return SITE.teamInboxEmail.split(',').map(e => e.trim()).filter(Boolean);
}

export async function sendTeamAlert(subject: string, text: string) {
  const to = teamEmails();
  if (to.length === 0) {
    console.warn('[email] No team inbox configured — skipping team alert:', subject);
    return null;
  }
  const { data, error } = await send({ to, subject, html: shell('NexterLaw · Snapshot alert', escapeHtml(subject), p(escapeHtml(text)), false) });
  if (error) throw new Error(`Resend error (team alert): ${error.message}`);
  return data;
}

export interface GlobalSubmissionNotificationOptions {
  submission: GlobalSubmission;
  dueText?: string;
}

const ANSWER_LABEL: Record<string, string> = { YES: 'Yes', NO: 'No', NOT_SURE: 'Not sure' };
const ANSWER_COLOUR: Record<string, string> = { YES: '#15803d', NO: '#b91c1c', NOT_SURE: '#b45309' };
const DIMENSION_FIELD: Record<DimensionKey, keyof GlobalSubmission> = {
  compliance: 'answerCompliance', literacy: 'answerLiteracy', explainability: 'answerExplainability',
  accountability: 'answerAccountability', rights: 'answerRights', transparency: 'answerTransparency',
  reliability: 'answerReliability', usageGovernance: 'answerUsageGovernance', security: 'answerSecurity',
  traceability: 'answerTraceability',
};

const practiceAreaLabel = (slug: string) => GLOBAL_PRACTICE_AREAS.find(a => a.slug === slug)?.label ?? slug;
const firmSizeLabel = (value: string) => GLOBAL_FIRM_SIZE_OPTIONS.find(o => o.value === value)?.label ?? value;

/** The team email for a new Global submission: every answer the firm gave, so the team can start the report. */
export function globalNotificationHtml({ submission: s, dueText }: GlobalSubmissionNotificationOptions): string {
  // Everything below comes from a public form: escape it before putting it in HTML.
  const text = (v: string | null | undefined) =>
    v && v.trim() ? escapeHtml(v).replace(/\n/g, '<br>') : '<span style="color:#9ca3af;font-weight:400;">—</span>';
  const answer = (v: string | null | undefined) =>
    v ? `<span style="color:${ANSWER_COLOUR[v] ?? '#374151'};font-weight:700;">${escapeHtml(ANSWER_LABEL[v] ?? v)}</span>` : text(null);
  const row = (label: string, value: string) =>
    `<tr><td style="padding:5px 12px 5px 0;color:#6b7280;width:45%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:5px 0;vertical-align:top;font-weight:600;">${value}</td></tr>`;
  const section = (title: string, rows: string[]) => `
    <p style="margin:22px 0 6px;font-size:11px;color:${NAVY};text-transform:uppercase;letter-spacing:2px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${escapeHtml(title)}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;color:#374151;">${rows.join('')}</table>`;

  const primaryArea = s.primaryPracticeArea === 'other' && s.primaryPracticeAreaOther
    ? `Other: ${s.primaryPracticeAreaOther}` : practiceAreaLabel(s.primaryPracticeArea);
  const intake = { outOfHours: s.intakeOutOfHours, replySpeed: s.intakeReplySpeed, volume: s.intakeVolume, caseSystem: s.intakeCaseSystem };
  const rating = s.intakeRating as IntakeRating | null;
  const websiteHref = s.firmWebsite && (/^https?:\/\//i.test(s.firmWebsite) ? s.firmWebsite : `https://${s.firmWebsite}`);
  const website = websiteHref
    ? `<a href="${escapeHtml(websiteHref)}" style="color:${NAVY};">${escapeHtml(s.firmWebsite ?? '')}</a>` : text(null);
  const score = s.scoreHeadline != null
    ? ` (score ${Math.round(s.scoreHeadline)}/100${s.scoreBand ? `, ${s.scoreBand.replace('_', ' ')}` : ''})` : '';

  return shell('NexterLaw · Global Snapshot', `New ${s.isTest ? 'TEST ' : ''}Global submission: ${escapeHtml(s.firmName)}`, `
    ${p(`Report due: <strong>${escapeHtml(dueText ?? 'no date (waitlist)')}</strong>. An AI first draft is being prepared in Admin: review it, edit it, then click Approve &amp; send.`)}
    <p style="text-align:center;margin:8px 0 0;">${button(absoluteUrl(`/admin/global-submissions/${s.id}`), 'Open in Admin')}</p>
    ${section('Contact', [
      row('Name', text(s.contactName)),
      row('Firm', text(s.firmName)),
      row('Website', website),
      row('Email', `<a href="mailto:${escapeHtml(s.workEmail)}" style="color:${NAVY};">${escapeHtml(s.workEmail)}</a>`),
      row('Phone', text(s.phone)),
    ])}
    ${section('Jurisdiction', [
      row('Country', text(s.country)),
      row('State / province', text(s.stateProvince)),
      row('Other states / provinces', text(s.secondaryStates.join(', '))),
      row('Regulatory body', text(s.regulatoryBody)),
      row('Other jurisdiction', text(s.secondaryJurisdiction)),
    ])}
    ${section('Firm profile', [
      row('Firm size', text(firmSizeLabel(s.firmSize))),
      row('Main practice area', text(primaryArea)),
      row('Other practice areas', text(s.secondaryPracticeAreas.map(practiceAreaLabel).join(', '))),
    ])}
    ${section('Current AI use', [
      row('Using AI now?', answer(s.currentlyUsingAi)),
      row('Tools in use', text(s.aiToolsInUse)),
      row('Written AI policy?', answer(s.hasAiPolicy)),
      row('Clients asked about AI?', answer(s.clientsAskedAboutAi)),
    ])}
    ${section(`CLEAR TRUST answers${score}`, CLEAR_TRUST_DIMENSIONS.map(d => row(
      `${d.letter} · ${d.name}: ${GLOBAL_QUESTION_OVERRIDES[d.key] ?? d.question}`,
      answer(s[DIMENSION_FIELD[d.key]] as string | null),
    )))}
    ${section(`Client intake${rating ? ` (${INTAKE_RATING_LABEL[rating] ?? rating})` : ''}`, INTAKE_QUESTIONS.map(q => row(
      q.question,
      text(intake[q.key] ? intakeLabel(q.key, intake[q.key]) : null),
    )))}
    ${section('In their words', [
      row('Biggest concern', text(s.biggestConcern)),
      row('What would help most', text(s.whatWouldHelpMost)),
    ])}
    ${section('Admin', [
      row('Marketing consent', s.marketingConsent ? 'Yes' : 'No'),
      row('Submitted', escapeHtml(`${s.createdAt.toISOString().replace('T', ' ').slice(0, 16)} UTC`)),
      row('Submission ID', `<span style="font-family:monospace;font-size:12px;font-weight:400;">${escapeHtml(s.id)}</span>`),
    ])}`, false);
}

export async function sendGlobalSubmissionNotification(o: GlobalSubmissionNotificationOptions) {
  const to = teamEmails();
  if (to.length === 0) {
    console.warn('[email] No team inbox configured — skipping Global submission notification.');
    return null;
  }
  const s = o.submission;
  const { data, error } = await send({
    to,
    subject: `New ${s.isTest ? 'TEST ' : ''}Global Snapshot submission — ${s.firmName} (${s.country})`,
    html: globalNotificationHtml(o),
  });
  if (error) throw new Error(`Resend error (Global notification): ${error.message}`);
  return data;
}
