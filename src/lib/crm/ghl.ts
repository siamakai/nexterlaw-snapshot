// GoHighLevel sync (SNAPSHOT-V2-SPEC §5).
//
// Modes (env GHL_MODE):
//   mock (default) — build the payload and log it; no network call. Used until GO.
//   live           — POST the payload to GHL_WEBHOOK_URL (an inbound-webhook workflow).
//   off            — do nothing.
// [CONFIRM] API vs webhook, custom-field names and pipeline names come from
// Parastoo's workflow list; the webhook keeps those mappings inside GoHighLevel.
// Test submissions are never synced. Marketing tags only with marketing consent.

export type CrmEvent = 'snapshot_completed' | 'global_submitted' | 'global_report_sent' | 'retake_reminder_requested';

export interface CrmContact {
  event: CrmEvent;
  email: string;
  firmName: string;
  firmWebsite?: string | null;
  contactName?: string | null;
  phone?: string | null;
  country?: string | null;
  path: 'uk' | 'global';
  band?: string | null;
  score?: number | null;
  sizeKey?: string | null;
  intakeRating?: string | null;
  euFacing?: string | null;
  route?: string | null;
  resultsUrl?: string | null;
  marketingConsent: boolean;
  isTest: boolean;
  /** Global only: report due time and reminder at 36 h. */
  dueAt?: Date | null;
}

export interface CrmPayload {
  event: CrmEvent;
  contact: { email: string; firmName: string; name?: string; phone?: string; website?: string; country?: string };
  tags: string[];
  customFields: Record<string, string | number>;
  opportunity?: { pipeline: string; dueAt: string; reminderAt: string };
}

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function buildCrmPayload(c: CrmContact): CrmPayload {
  const tags = ['snapshot-v2', `path-${c.path}`];
  if (c.band) tags.push(`band-${slug(c.band)}`);
  if (c.sizeKey) tags.push(`size-${slug(c.sizeKey)}`);
  if (c.intakeRating) tags.push(`intake-${slug(c.intakeRating)}`);
  if (c.euFacing) tags.push(`eu-${slug(c.euFacing)}`);
  if (c.route) tags.push(`route-${slug(c.route)}`);
  if (c.path === 'global') {
    tags.push('snapshot-global');
    if (c.country) tags.push(`country-${slug(c.country)}`);
  }
  if (c.marketingConsent) {
    tags.push('marketing-consent', 'nurture-snapshot');
    if (c.event === 'retake_reminder_requested') tags.push('retake-reminder');
  }

  const customFields: Record<string, string | number> = {};
  if (c.score != null) customFields.snapshot_score = Math.round(c.score);
  if (c.band) customFields.snapshot_band = c.band;
  if (c.resultsUrl) customFields.snapshot_results_url = c.resultsUrl;
  if (c.route) customFields.snapshot_route = c.route;
  if (c.intakeRating) customFields.snapshot_intake_rating = c.intakeRating;

  const payload: CrmPayload = {
    event: c.event,
    contact: {
      email: c.email,
      firmName: c.firmName,
      ...(c.contactName ? { name: c.contactName } : {}),
      ...(c.phone ? { phone: c.phone } : {}),
      ...(c.firmWebsite ? { website: c.firmWebsite } : {}),
      ...(c.country ? { country: c.country } : {}),
    },
    tags,
    customFields,
  };

  if (c.event === 'global_submitted' && c.dueAt) {
    payload.opportunity = {
      pipeline: 'Global Snapshot',
      dueAt: c.dueAt.toISOString(),
      reminderAt: new Date(c.dueAt.getTime() - 12 * 3600_000).toISOString(), // 36 h after a 48 h due date
    };
  }
  return payload;
}

export type CrmResult = { sent: false; reason: 'test' | 'off' | 'mock' | 'not-configured' } | { sent: true };

export async function syncToCrm(c: CrmContact, fetchImpl: typeof fetch = fetch): Promise<CrmResult> {
  if (c.isTest) return { sent: false, reason: 'test' };
  const mode = (process.env.GHL_MODE ?? 'mock').trim().toLowerCase();
  if (mode === 'off') return { sent: false, reason: 'off' };

  const payload = buildCrmPayload(c);
  if (mode !== 'live') {
    console.info('[crm] mock mode, not sent:', JSON.stringify({ ...payload, contact: { ...payload.contact, email: '<redacted>', phone: undefined } }));
    return { sent: false, reason: 'mock' };
  }

  const url = (process.env.GHL_WEBHOOK_URL ?? '').trim();
  if (!url) {
    console.warn('[crm] GHL_MODE=live but GHL_WEBHOOK_URL is not set; not sent.');
    return { sent: false, reason: 'not-configured' };
  }

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.GHL_API_KEY ? { Authorization: `Bearer ${process.env.GHL_API_KEY}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GoHighLevel webhook returned ${res.status}`);
  return { sent: true };
}
