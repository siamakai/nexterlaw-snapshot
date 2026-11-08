import type { RouteId } from '@/config/next-steps';
import type { BandLabel } from './bands';
import type { IntakeRating } from './intake';

export type SizeGroup = 'SOLE' | 'TWO_TO_TWENTY' | 'TWENTY_ONE_PLUS';

/** UK FirmSizeBand → spec size group. MICRO is labelled "2–4" from v2. */
export function sizeGroupUk(size: string): SizeGroup {
  if (size === 'SOLE') return 'SOLE';
  if (size === 'MICRO' || size === 'SMALL') return 'TWO_TO_TWENTY';
  return 'TWENTY_ONE_PLUS';
}

/** Global firm-size taxonomy → spec size group ("11–50" counts as 21+ for routing). */
export function sizeGroupGlobal(size: string): SizeGroup {
  if (size === 'solo') return 'SOLE';
  if (size === '2-10') return 'TWO_TO_TWENTY';
  return 'TWENTY_ONE_PLUS';
}

export interface RoutingInput {
  path: 'UK' | 'GLOBAL';
  sizeGroup: SizeGroup;
  euFacing: 'YES' | 'NO' | 'NOT_SURE' | null;
  band: BandLabel;
  intakeRating: IntakeRating | null;
}

/** Spec §3 table; first match wins. */
export function chooseRoute(i: RoutingInput): RouteId {
  if (i.path === 'GLOBAL') return 'GLOBAL';
  if (i.sizeGroup === 'TWENTY_ONE_PLUS' || (i.euFacing === 'YES' && (i.band === 'EXPOSED' || i.band === 'DEVELOPING'))) {
    return 'GOVERNANCE_REVIEW';
  }
  if (i.sizeGroup === 'TWO_TO_TWENTY' && i.intakeRating === 'HIGH') return 'INTAKE_REVIEW';
  if (i.sizeGroup === 'TWO_TO_TWENTY') return 'SNAPSHOT_REVIEW';
  return 'SKOOL';
}
