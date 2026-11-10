import { Resend } from 'resend';
import type { ClearTrustScores } from '@/types';
import type { ResolvedNextStep } from '@/config/next-steps';
import { SITE } from '@/config/site';
import { escapeHtml } from '@/lib/security/tokens';
import { absoluteUrl } from '@/lib/urls';

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
  return (process.env.TEAM_NOTIFICATION_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean);
}

export async function sendTeamAlert(subject: string, text: string) {
  const to = teamEmails();
  if (to.length === 0) {
    console.warn('[email] TEAM_NOTIFICATION_EMAIL not configured — skipping team alert:', subject);
    return null;
  }
  const { data, error } = await send({ to, subject, html: shell('NexterLaw · Snapshot alert', escapeHtml(subject), p(escapeHtml(text)), false) });
  if (error) throw new Error(`Resend error (team alert): ${error.message}`);
  return data;
}

export interface GlobalSubmissionNotificationOptions {
  submissionId: string;
  contactName: string;
  firmName: string;
  workEmail: string;
  country: string;
  stateProvince: string;
  primaryPracticeArea: string;
  dueText?: string;
  isTest?: boolean;
}

function globalNotificationHtml(o: GlobalSubmissionNotificationOptions): string {
  // Everything below comes from a public form: escape it before putting it in HTML.
  const region = o.stateProvince ? `, ${escapeHtml(o.stateProvince)}` : '';
  const row = (label: string, value: string, mono = false) =>
    `<tr><td style="padding:4px 0;color:#6b7280;width:130px;">${label}</td><td style="padding:4px 0;${mono ? 'font-family:monospace;font-size:12px;' : 'font-weight:600;'}">${value}</td></tr>`;
  return shell('NexterLaw · Global Snapshot', `New ${o.isTest ? 'TEST ' : ''}manual-report submission`, `
    <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;color:#374151;">
      ${row('Contact', escapeHtml(o.contactName))}
      ${row('Firm', escapeHtml(o.firmName))}
      ${row('Email', escapeHtml(o.workEmail))}
      ${row('Country', `${escapeHtml(o.country)}${region}`)}
      ${row('Practice area', escapeHtml(o.primaryPracticeArea))}
      ${o.dueText ? row('Report due', escapeHtml(o.dueText)) : ''}
      ${row('Submission ID', escapeHtml(o.submissionId), true)}
    </table>
    <p style="text-align:center;margin:24px 0 0;">${button(absoluteUrl(`/admin/global-submissions/${o.submissionId}`), 'Open in Admin')}</p>`, false);
}

export async function sendGlobalSubmissionNotification(o: GlobalSubmissionNotificationOptions) {
  const to = teamEmails();
  if (to.length === 0) {
    console.warn('[email] TEAM_NOTIFICATION_EMAIL not configured — skipping Global submission notification.');
    return null;
  }
  const { data, error } = await send({
    to,
    subject: `New ${o.isTest ? 'TEST ' : ''}Global Snapshot submission — ${o.firmName} (${o.country})`,
    html: globalNotificationHtml(o),
  });
  if (error) throw new Error(`Resend error (Global notification): ${error.message}`);
  return data;
}
