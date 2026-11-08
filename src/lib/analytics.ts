'use client';

// Analytics events (spec §6). Provider-neutral: pushes to window.dataLayer (Google
// Tag Manager) and window.plausible if either is installed; otherwise logs in
// development. [CONFIRM] which provider to install.
// NEVER pass personal data (names, emails, firm names, free text) or tokens.

export type AnalyticsEvent =
  | 'landing_view' | 'start_click' | 'path_selected' | 'q_answered' | 'intake_completed'
  | 'details_submitted' | 'report_ready' | 'report_failed' | 'next_step_click'
  | 'pdf_download' | 'share_click' | 'email_report';

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    plausible?: (event: string, opts?: { props?: Props }) => void;
  }
}

const ALLOWED_PROPS = new Set(['path', 'question', 'answer', 'band', 'route', 'target', 'size', 'intake', 'step', 'device', 'score_bucket']);

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return;
  // Defensive allow-list so personal data can't slip in by accident.
  const safe = Object.fromEntries(Object.entries(props).filter(([k]) => ALLOWED_PROPS.has(k)));
  try {
    window.dataLayer?.push({ event, ...safe });
    window.plausible?.(event, { props: safe });
    if (process.env.NODE_ENV === 'development') console.debug('[analytics]', event, safe);
  } catch {
    // analytics must never break the page
  }
}

/** Score rounded to a 10-point bucket, so analytics never holds an exact score per visitor. */
export function scoreBucket(score: number): string {
  const lo = Math.min(90, Math.floor(score / 10) * 10);
  return `${lo}-${lo + 10}`;
}
