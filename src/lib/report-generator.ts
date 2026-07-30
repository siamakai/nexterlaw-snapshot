import Anthropic from '@anthropic-ai/sdk';
import type { IntakeData, ClearTrustScores, GeneratedReportContent } from '@/types';

interface KBEntry {
  title: string;
  bodyText: string;
  sourceReference: string | null;
}

export interface RetrievedKB {
  regulatory: KBEntry[];
  useCases: KBEntry[];
  risks: KBEntry[];
  euLayer: KBEntry[];
  toolCategories: KBEntry[];
}

export interface GenerationResult {
  report: GeneratedReportContent;
  rawResponse: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
}

const MODEL = 'claude-opus-4-8';
const MAX_RETRIES = 2;

const FIRM_SIZE_LABELS: Record<string, string> = {
  MICRO: '1–4 fee-earners',
  SMALL: '5–20 fee-earners',
  MEDIUM: '21–50 fee-earners',
  LARGE: '51–200 fee-earners',
  ENTERPRISE: '200+ fee-earners',
};

function formatKBSection(entries: KBEntry[], label: string): string {
  if (!entries.length) return '';
  const lines = entries
    .map(
      (e, i) =>
        `[${i + 1}] ${e.title}\n${e.bodyText}${e.sourceReference ? `\nSource: ${e.sourceReference}` : ''}`,
    )
    .join('\n\n');
  return `### ${label}\n${lines}`;
}

function buildSystemPrompt(includeEuAiAct: boolean): string {
  return `You are an expert AI governance consultant writing a professional AI readiness report for a UK law firm. Your output MUST be a single JSON object — no preamble, no markdown fences, no trailing text.

GROUNDING RULE: You may only draw on the knowledge base entries provided in the user message. Do not add regulatory claims, tool names, risk descriptions, or legal guidance not present in those entries.

TONE RULES:
- Write in British English throughout (e.g. "practise", "recognise", "licence" as noun, "programme")
- Professional yet accessible — avoid unexplained jargon
- Factual and measured — no alarmist language, no marketing hyperbole
- Address the firm in second person plural: "your firm", "you are", "your fee-earners"
- Do not begin any sentence with the word "And"
${
  includeEuAiAct
    ? ''
    : '\nIMPORTANT: Do NOT mention the EU AI Act anywhere in this report. The firm confirmed it has no EU-facing operations.'
}

OUTPUT FORMAT: Return exactly this JSON structure (all string fields must be substantive prose, minimum 2 paragraphs each):
{
  "cover": {
    "firmName": "string",
    "date": "string (e.g. 'July 2026')",
    "disclaimer": "string (2–3 sentences: scope disclaimer stating this is an indicative self-assessment, not legal advice)"
  },
  "scoreNarrative": "string (4–6 paragraphs: headline score and band meaning; what it signals about the firm's AI maturity; 2–3 strongest dimensions; 2–3 dimensions needing attention; forward-looking statement encouraging progress)",
  "regulatoryMap": {
    "sra": "string (2–3 paragraphs: SRA Code of Conduct and AI governance obligations relevant to this firm's size and practice areas)",
    "ukGdpr": "string (2–3 paragraphs: UK GDPR and Data Protection Act 2018 obligations when using AI on client data)",
    "pii": "string (2–3 paragraphs: professional indemnity insurance implications of AI use — duty of care, disclosure obligations, coverage gaps)",
    "clientProcurement": "string (2–3 paragraphs: how clients are scrutinising law firm AI use in matter instructions, ESG due diligence, and panel reviews)"${
      includeEuAiAct
        ? `,
    "euAiAct": "string (2–3 paragraphs: EU AI Act risk classification, obligations for legal-sector AI systems, and compliance timeline for EU-facing work)"`
        : ''
    }
  },
  "shadowAi": "string (2–3 paragraphs: risk of fee-earners using unapproved consumer AI tools — specific to this firm's size and practice types — and recommended governance controls)",
  "opportunities": [
    {
      "title": "string (concise opportunity name, 3–7 words)",
      "benefit": "string (1–2 sentences: concrete benefit specific to this firm's practice types and size)",
      "toolCategory": "string (category of AI tool that delivers this benefit)"
    }
  ],
  "exposures": [
    {
      "title": "string (concise risk name, 3–7 words)",
      "description": "string (2–3 sentences: risk description and potential consequence for this firm)",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "upsell": "string (2–3 sentences: professional invitation to discuss AI governance support with NexterLaw, referencing their expertise in legal-sector AI governance, ending with a specific call to action such as booking a consultation)"
}

Provide exactly 3–5 opportunities and 3–5 exposures. Severity must be one of: HIGH, MEDIUM, LOW.`;
}

function buildUserPrompt(
  intake: IntakeData,
  scores: ClearTrustScores,
  kb: RetrievedKB,
  includeEuAiAct: boolean,
): string {
  const dimTable = scores.dimensions
    .map(
      d =>
        `  ${d.letter}. ${d.name}: ${Math.round(d.score)}/100 (self-assessed: ${d.answer})`,
    )
    .join('\n');

  const reportDate = new Date().toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const kbSections = [
    formatKBSection(kb.regulatory, 'Regulatory Guidance'),
    formatKBSection(kb.useCases, 'AI Use Cases (relevant to this firm)'),
    formatKBSection(kb.risks, 'Risk Library'),
    includeEuAiAct ? formatKBSection(kb.euLayer, 'EU AI Act Layer') : '',
    formatKBSection(kb.toolCategories, 'AI Tool Categories'),
  ]
    .filter(Boolean)
    .join('\n\n');

  return `Generate a CLEAR TRUST AI Readiness Report for the following firm.

## FIRM PROFILE
- Name: ${intake.firmName}
- Website: ${intake.firmWebsite || 'Not provided'}
- Location: ${intake.city}, ${intake.country}
- Practice area(s): ${intake.practiceTypes.join(', ')}
- Firm size: ${FIRM_SIZE_LABELS[intake.firmSize as string] ?? intake.firmSize}
- EU-facing work: ${intake.euFacing}
- Report date: ${reportDate}

## CLEAR TRUST SELF-ASSESSMENT RESULTS
Headline score: ${Math.round(scores.headline)}/100 — ${scores.bandDisplayName}

Dimension scores:
${dimTable}

## KNOWLEDGE BASE ENTRIES
Use ONLY the entries below for all regulatory, risk, and tool-category claims.

${kbSections}

Output the JSON report now. JSON only — no markdown fences, no preamble.`;
}

function parseReportJson(raw: string): GeneratedReportContent | null {
  let cleaned = raw.trim();

  // Strip markdown code fences if model ignored the instruction
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  }

  // Extract outermost JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as Partial<GeneratedReportContent>;

    if (
      !obj.cover ||
      typeof obj.scoreNarrative !== 'string' ||
      !obj.regulatoryMap ||
      typeof obj.shadowAi !== 'string' ||
      !Array.isArray(obj.opportunities) ||
      !Array.isArray(obj.exposures) ||
      typeof obj.upsell !== 'string'
    ) {
      return null;
    }

    return obj as GeneratedReportContent;
  } catch {
    return null;
  }
}

export async function generateReport(
  intake: IntakeData,
  scores: ClearTrustScores,
  kb: RetrievedKB,
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const includeEuAiAct = intake.euFacing === 'YES' || intake.euFacing === 'NOT_SURE';

  const systemPrompt = buildSystemPrompt(includeEuAiAct);
  const userPrompt = buildUserPrompt(intake, scores, kb, includeEuAiAct);

  let lastError: Error = new Error('Report generation failed');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const message = await stream.finalMessage();

      // Extract text blocks only (skip thinking blocks)
      const rawResponse = message.content.reduce((acc, block) => {
        if (block.type === 'text') acc += block.text;
        return acc;
      }, '');

      const parsed = parseReportJson(rawResponse);

      if (!parsed) {
        lastError = new Error(
          `Attempt ${attempt + 1}: Claude did not return valid JSON. Raw: ${rawResponse.slice(0, 200)}`,
        );
        continue;
      }

      // Hard guard: strip EU AI Act section if firm is not EU-facing
      if (!includeEuAiAct && parsed.regulatoryMap.euAiAct) {
        delete parsed.regulatoryMap.euAiAct;
      }

      return {
        report: parsed,
        rawResponse,
        modelUsed: message.model,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError;
}
