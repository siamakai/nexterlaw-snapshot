// Next-step routing (SNAPSHOT-V2-SPEC §3): one main button + one secondary link.
// All destinations come from environment variables ([CONFIRM #9] in OPEN-DECISIONS).
// An unset destination falls back to an email to the contact address, never a dead link.
// Server-only: resolve with resolveNextStep() and pass the result to the client.

import { linkOrContact } from './site';

export type RouteId = 'GLOBAL' | 'GOVERNANCE_REVIEW' | 'INTAKE_REVIEW' | 'SNAPSHOT_REVIEW' | 'SKOOL';
export type Brand = 'NexterLaw' | 'Nexter AI Agency' | 'Skool';
type DestinationId = 'governanceCall' | 'intakeReview' | 'snapshotReview' | 'webinar' | 'skool' | 'courseAiLaw';

const env = (name: string) => (process.env[name] ?? '').trim();

/**
 * Destination URLs. A Vercel env var overrides; otherwise the confirmed link below is used.
 * Confirmed by Siamak, 10 Nov 2026: intake review → https://nexterai.agency/booking
 */
function destinations(): Record<DestinationId, string> {
  return {
    governanceCall: env('NEXT_STEP_GOVERNANCE_CALL_URL') || env('CALENDLY_BOOKING_URL'),
    intakeReview:   env('NEXT_STEP_INTAKE_REVIEW_URL') || 'https://nexterai.agency/booking',
    snapshotReview: env('NEXT_STEP_SNAPSHOT_REVIEW_URL') || env('CALENDLY_BOOKING_URL'),
    webinar:        env('NEXT_STEP_WEBINAR_URL'),
    skool:          env('NEXT_STEP_SKOOL_URL'),
    courseAiLaw:    env('NEXT_STEP_COURSE_AI_LAW_URL'),
  };
}

interface RouteDef {
  brand: Brand;
  main: { label: string; destination: DestinationId | null; note?: string };
  secondary: { label: string; destination: DestinationId };
}

/**
 * How the report's next-step paragraph names the provider of the next step
 * (decided 10 Nov 2026: agency offers are presented as our service provision partner).
 */
export const PROVIDER_PHRASE: Record<Brand, string> = {
  'NexterLaw': 'NexterLaw',
  'Nexter AI Agency': 'Nexter AI Agency, our service provision partner',
  'Skool': 'the Nexter AI Business Club',
};

export function providerPhraseFor(route: RouteId | null | undefined): string {
  return PROVIDER_PHRASE[ROUTES[route ?? 'SNAPSHOT_REVIEW']?.brand ?? 'NexterLaw'];
}

export const ROUTES: Record<RouteId, RouteDef> = {
  GLOBAL: {
    brand: 'NexterLaw',
    main: { label: 'Register for the next webinar', destination: 'webinar', note: 'We’ll be in touch within 48 hours.' },
    secondary: { label: 'Join the Nexter AI Business Club', destination: 'skool' },
  },
  GOVERNANCE_REVIEW: {
    brand: 'NexterLaw',
    main: { label: 'Book a governance review call', destination: 'governanceCall' },
    secondary: { label: 'Register for the next webinar', destination: 'webinar' },
  },
  INTAKE_REVIEW: {
    brand: 'Nexter AI Agency',
    main: { label: 'Book a free 20-minute intake review', destination: 'intakeReview' },
    secondary: { label: 'Register for the next webinar', destination: 'webinar' },
  },
  SNAPSHOT_REVIEW: {
    brand: 'Nexter AI Agency', // [CONFIRM #6] or NexterLaw
    main: { label: 'Book a free Snapshot review call', destination: 'snapshotReview' },
    secondary: { label: 'Join the Nexter AI Business Club', destination: 'skool' },
  },
  SKOOL: {
    brand: 'Skool',
    main: { label: 'Join the Nexter AI Business Club', destination: 'skool' },
    secondary: { label: 'See the AI & Law course', destination: 'courseAiLaw' },
  },
};

export interface ResolvedNextStep {
  route: RouteId;
  brand: Brand;
  note: string | null;
  main: { label: string; href: string };
  secondary: { label: string; href: string };
}

export function resolveNextStep(route: RouteId): ResolvedNextStep {
  const def = ROUTES[route];
  const urls = destinations();
  return {
    route,
    brand: def.brand,
    note: def.main.note ?? null,
    main: {
      label: def.main.label,
      href: linkOrContact(def.main.destination ? urls[def.main.destination] : '', def.main.label),
    },
    secondary: {
      label: def.secondary.label,
      href: linkOrContact(urls[def.secondary.destination], def.secondary.label),
    },
  };
}
