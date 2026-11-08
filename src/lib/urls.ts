import { SITE } from '@/config/site';

/** Absolute link to a results page (used in emails and the CRM). */
export function resultsUrl(token: string): string {
  return `${SITE.appUrl.replace(/\/$/, '')}/r/${token}`;
}

export function absoluteUrl(path: string): string {
  return `${SITE.appUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
