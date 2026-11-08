import { APPROVED_REFERENCES, type ApprovedReference } from '../../content/approved-references';

/**
 * Finds pinpoint regulatory citations in generated text and checks them against
 * the approved list. Instrument names on their own ("UK GDPR", "the SRA Code of
 * Conduct", "the EU AI Act") are always allowed; numbered pinpoints are not,
 * unless approved.
 */

const CITATION_PATTERNS: Array<{ family: string; re: RegExp; replacement: string }> = [
  { family: 'principle', re: /\b(?:SRA\s+)?Principles?\s+\d+(?:\s*(?:,|and|&)\s*\d+)*/gi, replacement: 'the SRA Principles' },
  { family: 'rule',      re: /\b(?:SRA\s+)?(?:Code\s+of\s+Conduct\s+)?Rules?\s+\d+(?:\.\d+)*/gi,  replacement: 'the relevant SRA rules' },
  { family: 'para',      re: /\b(?:(?:SRA\s+)?(?:Code(?:\s+of\s+Conduct)?(?:\s+for\s+(?:Solicitors|Firms))?,?\s*)?)(?:para(?:graph)?s?\.?)\s*\d+(?:\.\d+)*/gi, replacement: 'the SRA Code of Conduct' },
  { family: 'article',   re: /\bArt(?:icle)?s?\.?\s+\d+(?:\(\d+\))?(?:\s*(?:,|and|&|–|-)\s*\d+(?:\(\d+\))?)*/gi, replacement: 'the relevant provisions' },
  { family: 'annex',     re: /\bAnnex\s+[IVXLC]+\b/gi, replacement: 'the relevant annex' },
  { family: 'title',     re: /\bTitle\s+[IVXLC]+\b/gi, replacement: 'the relevant provisions' },
  { family: 'chapter',   re: /\bChapter\s+(?:[IVXLC]+|\d+)\b/gi, replacement: 'the relevant provisions' },
  { family: 'section',   re: /\b(?:section|s\.)\s?\d+[A-Z]?\b/gi, replacement: 'the relevant provisions' },
];

export interface CitationFinding {
  citation: string;
  family: string;
  path: string;
  approved: boolean;
}

function isApproved(citation: string, before: string, list: ApprovedReference[]): boolean {
  const context = `${before}${citation}`;
  return list.some(ref => ref.match.test(context));
}

/** Scans one string. */
export function findCitations(text: string, path = '', list = APPROVED_REFERENCES): CitationFinding[] {
  const findings: CitationFinding[] = [];
  const seen = new Set<string>();
  for (const { family, re } of CITATION_PATTERNS) {
    for (const m of text.matchAll(new RegExp(re.source, re.flags))) {
      const start = m.index ?? 0;
      const key = `${start}:${m[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const before = text.slice(Math.max(0, start - 60), start);
      findings.push({ citation: m[0].trim(), family, path, approved: isApproved(m[0], before, list) });
    }
  }
  return findings;
}

/** Walks every string inside a report object. */
export function checkReport(report: unknown, list = APPROVED_REFERENCES): CitationFinding[] {
  const out: CitationFinding[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') out.push(...findCitations(value, path, list));
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(report, '');
  return out;
}

export function unapproved(findings: CitationFinding[]): CitationFinding[] {
  return findings.filter(f => !f.approved);
}

/** Fallback: replace unapproved pinpoints with neutral wording, keep approved ones. */
export function stripUnapprovedCitations<T>(report: T, list = APPROVED_REFERENCES): T {
  const fix = (text: string): string => {
    let out = text;
    for (const { re, replacement } of CITATION_PATTERNS) {
      out = out.replace(new RegExp(re.source, re.flags), (match, ...rest) => {
        const offset = rest[rest.length - 2] as number;
        const whole = rest[rest.length - 1] as string;
        const before = whole.slice(Math.max(0, offset - 60), offset);
        return isApproved(match, before, list) ? match : replacement;
      });
    }
    return out
      .replace(/\b(the SRA Principles|the relevant SRA rules|the SRA Code of Conduct|the relevant provisions|the relevant annex)(?:\s*(?:and|,|;)\s*\1)+/g, '$1')
      .replace(/\bSRA\s+the\b/g, 'the')
      .replace(/\b(UK GDPR|GDPR|EU AI Act)\s+the relevant provisions/g, 'the relevant provisions of $1')
      .replace(/\bthe\s+the\b/gi, 'the')
      .replace(/\(\s*(?:the relevant provisions|the SRA Code of Conduct|the SRA Principles|the relevant SRA rules)?\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;:])/g, '$1');
  };
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return fix(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
    }
    return value;
  };
  return walk(report) as T;
}
