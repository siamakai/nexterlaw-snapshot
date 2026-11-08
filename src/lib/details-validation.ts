import { EMAIL_RE, isLikelyWebsite } from './validation';

export interface UkDetails {
  firmName: string;
  firmWebsite: string;
  practiceTypes: string[];
  firmSize: string;
  euFacing: string;
  workEmail: string;
}

export const EMPTY_UK_DETAILS: UkDetails = { firmName: '', firmWebsite: '', practiceTypes: [], firmSize: '', euFacing: '', workEmail: '' };

export type UkDetailsErrors = Partial<Record<keyof UkDetails | 'adviceConsent', string>>;

/** Same rules as the server (src/app/api/submit/route.ts). */
export function validateUkDetails(d: UkDetails, adviceConsent: boolean): UkDetailsErrors {
  const e: UkDetailsErrors = {};
  if (!d.firmName.trim()) e.firmName = 'Please enter your firm’s name.';
  if (d.firmWebsite.trim() && !isLikelyWebsite(d.firmWebsite)) e.firmWebsite = 'Please enter a valid website, e.g. www.yourfirm.co.uk';
  if (d.practiceTypes.length === 0) e.practiceTypes = 'Select at least one practice area.';
  if (!d.firmSize) e.firmSize = 'Please choose your firm size.';
  if (!d.euFacing) e.euFacing = 'Please answer the EU question.';
  if (!d.workEmail.trim()) e.workEmail = 'Please enter your work email.';
  else if (!EMAIL_RE.test(d.workEmail.trim())) e.workEmail = 'Please enter a valid email address.';
  if (!adviceConsent) e.adviceConsent = 'Please confirm you understand this is general information, not advice.';
  return e;
}
