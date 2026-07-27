import { Resend } from 'resend';
import type { ClearTrustScores } from '@/types';

const FROM_ADDRESS = 'NexterLaw <no-reply@nexterlaw.com>';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://snapshot.nexterlaw.com';

// ── Email builders ────────────────────────────────────────────────────────────

function day0Html(opts: {
  firmName: string;
  contactName: string;
  headline: number;
  bandDisplayName: string;
  bandColour: string;
  submissionId: string;
  pdfUrl: string;
}): string {
  const reportLink = `${BASE_URL}${opts.pdfUrl}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #d1d9e6;">
      <tr><td style="background:#1a3a6b;padding:32px 40px;">
        <p style="margin:0;color:#ffffff;font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;">NexterLaw</p>
        <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your AI Readiness Report is ready</h1>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">Dear ${opts.contactName},</p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Thank you for completing the NexterLaw CLEAR TRUST AI Readiness Snapshot for <strong>${opts.firmName}</strong>.
          Your report has been generated and is ready for download.
        </p>
        <table cellpadding="0" cellspacing="0" style="background:#f4f6fb;border-radius:6px;padding:20px 24px;margin:0 0 24px;border-left:4px solid ${opts.bandColour};">
          <tr><td>
            <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Overall Score</p>
            <p style="margin:0 0 2px;font-size:36px;font-weight:700;color:${opts.bandColour};">${Math.round(opts.headline)}</p>
            <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">${opts.bandDisplayName}</p>
          </td></tr>
        </table>
        <p style="text-align:center;margin:0 0 32px;">
          <a href="${reportLink}" style="display:inline-block;background:#1a3a6b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:14px;font-weight:600;">Download Your Report (PDF)</a>
        </p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
          Your report covers the ten dimensions of the CLEAR TRUST framework, your firm's regulatory obligations under the SRA, UK GDPR, and PII, plus personalised AI opportunities and risk exposures.
        </p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0;">
          If you have any questions or would like to discuss your results with one of our AI governance specialists, simply reply to this email or
          <a href="${process.env.CALENDLY_BOOKING_URL ?? '#'}" style="color:#1a3a6b;">book a complimentary 30-minute consultation</a>.
        </p>
      </td></tr>
      <tr><td style="background:#f4f6fb;padding:20px 40px;border-top:1px solid #d1d9e6;">
        <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
          This report is an indicative self-assessment only and does not constitute legal advice.<br>
          NexterLaw · <a href="https://nexterlaw.com" style="color:#1a3a6b;">nexterlaw.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function day3Html(opts: { firmName: string; contactName: string; submissionId: string }): string {
  const reportLink = `${BASE_URL}/api/report/${opts.submissionId}/pdf`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #d1d9e6;">
      <tr><td style="background:#1a3a6b;padding:24px 40px;">
        <p style="margin:0;color:#ffffff;font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;">NexterLaw</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">Dear ${opts.contactName},</p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
          Three days ago you received your CLEAR TRUST AI Readiness Report for <strong>${opts.firmName}</strong>. We hope it has given you a clear picture of where your firm stands on AI governance.
        </p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
          If you haven't had the opportunity to review it yet, your report is still available:
        </p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${reportLink}" style="display:inline-block;background:#1a3a6b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:13px;font-weight:600;">Access Your Report</a>
        </p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0;">
          Our AI governance specialists are available to walk you through the findings and help you prioritise next steps.
          <a href="${process.env.CALENDLY_BOOKING_URL ?? '#'}" style="color:#1a3a6b;">Book a free consultation.</a>
        </p>
      </td></tr>
      <tr><td style="background:#f4f6fb;padding:16px 40px;border-top:1px solid #d1d9e6;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">NexterLaw · <a href="https://nexterlaw.com" style="color:#1a3a6b;">nexterlaw.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function day7Html(opts: { firmName: string; contactName: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #d1d9e6;">
      <tr><td style="background:#1a3a6b;padding:24px 40px;">
        <p style="margin:0;color:#ffffff;font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;">NexterLaw</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">Dear ${opts.contactName},</p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
          One week has passed since your AI Readiness Snapshot for <strong>${opts.firmName}</strong>. Law firms that act on their governance gaps now are better positioned as regulators and clients increase their scrutiny of AI use.
        </p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
          NexterLaw offers a structured AI Governance Programme that builds directly on your CLEAR TRUST score — turning the report's recommendations into a documented policy framework, staff training, and ongoing compliance monitoring.
        </p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${process.env.CALENDLY_BOOKING_URL ?? '#'}" style="display:inline-block;background:#1a3a6b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:13px;font-weight:600;">Book a Free Strategy Call</a>
        </p>
        <p style="color:#4b5563;font-size:12px;color:#9ca3af;line-height:1.5;margin:0;">
          If you no longer wish to receive these emails, please reply with "Unsubscribe" in the subject line.
        </p>
      </td></tr>
      <tr><td style="background:#f4f6fb;padding:16px 40px;border-top:1px solid #d1d9e6;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">NexterLaw · <a href="https://nexterlaw.com" style="color:#1a3a6b;">nexterlaw.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface SendDay0Options {
  to: string;
  firmName: string;
  scores: ClearTrustScores;
  submissionId: string;
  pdfUrl: string;
}

export async function sendDay0Email(opts: SendDay0Options) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const contactName = opts.firmName;
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    subject: `Your AI Readiness Report is ready — ${opts.firmName}`,
    html: day0Html({
      firmName: opts.firmName,
      contactName,
      headline: opts.scores.headline,
      bandDisplayName: opts.scores.bandDisplayName,
      bandColour: opts.scores.bandColour,
      submissionId: opts.submissionId,
      pdfUrl: opts.pdfUrl,
    }),
  });

  if (error) throw new Error(`Resend error (Day 0): ${error.message}`);
  return data;
}

export interface SendDay3Options {
  to: string;
  firmName: string;
  submissionId: string;
}

export async function sendDay3Email(opts: SendDay3Options) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    subject: `Your AI Readiness Report — a quick reminder`,
    html: day3Html({ firmName: opts.firmName, contactName: opts.firmName, submissionId: opts.submissionId }),
  });

  if (error) throw new Error(`Resend error (Day 3): ${error.message}`);
  return data;
}

export interface SendDay7Options {
  to: string;
  firmName: string;
}

export async function sendDay7Email(opts: SendDay7Options) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    subject: `Strengthen your AI governance with NexterLaw`,
    html: day7Html({ firmName: opts.firmName, contactName: opts.firmName }),
  });

  if (error) throw new Error(`Resend error (Day 7): ${error.message}`);
  return data;
}
