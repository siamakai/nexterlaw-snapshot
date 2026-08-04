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
  requestId: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  estimatedCostUsd: number;
}

const MODEL = 'claude-opus-4-8';
const MAX_RETRIES = 2;

// Anthropic pricing as of 2026-07 (per 1M tokens)
const MODEL_PRICING: Record<string, {
  inputPer1M: number;
  outputPer1M: number;
  cacheWritePer1M: number; // 1.25× base
  cacheReadPer1M: number;  // 0.1× base
}> = {
  'claude-opus-4-8':   { inputPer1M: 5.0,  outputPer1M: 25.0, cacheWritePer1M: 6.25, cacheReadPer1M: 0.50 },
  'claude-opus-4-7':   { inputPer1M: 5.0,  outputPer1M: 25.0, cacheWritePer1M: 6.25, cacheReadPer1M: 0.50 },
  'claude-sonnet-4-6': { inputPer1M: 3.0,  outputPer1M: 15.0, cacheWritePer1M: 3.75, cacheReadPer1M: 0.30 },
  'claude-haiku-4-5':  { inputPer1M: 1.0,  outputPer1M: 5.0,  cacheWritePer1M: 1.25, cacheReadPer1M: 0.10 },
};

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens = 0,
  cacheReadTokens = 0,
): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING['claude-opus-4-8'];
  return (
    (inputTokens      / 1_000_000) * p.inputPer1M +
    (outputTokens     / 1_000_000) * p.outputPer1M +
    (cacheWriteTokens / 1_000_000) * p.cacheWritePer1M +
    (cacheReadTokens  / 1_000_000) * p.cacheReadPer1M
  );
}

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
  return `You are an expert AI governance consultant writing a professional AI readiness report for a UK law firm.

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

GROUNDING RULE: You may only draw on the knowledge base entries provided in the user message. Do not add regulatory claims, tool names, risk descriptions, or legal guidance not present in those entries.

CONTENT REQUIREMENTS:
- scoreNarrative: 4–6 paragraphs — headline score meaning, strongest dimensions, dimensions needing attention, forward-looking statement
- Each regulatoryMap field: 2–3 paragraphs
- shadowAi: 2–3 paragraphs on the risk of fee-earners using unapproved AI tools
- opportunities: 3–5 items, each with a concrete benefit specific to this firm's practice types and size
- exposures: 3–5 items, severity must be HIGH, MEDIUM, or LOW
- upsell: 2–3 sentences — professional invitation to discuss AI governance support with NexterLaw`;
}

// Returns the knowledge-base block (large) and the firm-specific block separately so
// that cache_control can be placed after the KB block. Render order in the Anthropic
// API is: tools → system → messages. Placing cache_control after the KB means the
// entire tools+system+KB prefix is cached. On Opus 4.8 the minimum cacheable prefix
// is 4096 tokens; tools + system + KB (~10K tokens) comfortably exceeds that.
// Cache hits occur for repeat submissions sharing the same practice-type combination.
function buildUserPromptParts(
  intake: IntakeData,
  scores: ClearTrustScores,
  kb: RetrievedKB,
  includeEuAiAct: boolean,
): { kbText: string; firmText: string } {
  const kbSections = [
    formatKBSection(kb.regulatory, 'Regulatory Guidance'),
    formatKBSection(kb.useCases, 'AI Use Cases (relevant to this firm)'),
    formatKBSection(kb.risks, 'Risk Library'),
    includeEuAiAct ? formatKBSection(kb.euLayer, 'EU AI Act Layer') : '',
    formatKBSection(kb.toolCategories, 'AI Tool Categories'),
  ]
    .filter(Boolean)
    .join('\n\n');

  const kbText =
    `## KNOWLEDGE BASE ENTRIES\nUse ONLY the entries below for all regulatory, risk, and tool-category claims.\n\n${kbSections}`;

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

  const firmText = `Generate a CLEAR TRUST AI Readiness Report for the following firm.

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
${dimTable}`;

  return { kbText, firmText };
}

// ── Tool definition ────────────────────────────────────────────────────────────
// Using tool use forces the SDK to produce structurally-valid JSON via grammar
// sampling, eliminating all JSON parsing and sanitisation.

function buildReportTool(includeEuAiAct: boolean): Anthropic.Tool {
  const regulatoryMapProperties: Record<string, Anthropic.Tool.InputSchema['properties']> = {
    sra: {
      type: 'string',
      description: '2–3 paragraphs on SRA Code of Conduct obligations relevant to this firm',
    },
    ukGdpr: {
      type: 'string',
      description: '2–3 paragraphs on UK GDPR and DPA 2018 obligations when using AI on client data',
    },
    pii: {
      type: 'string',
      description: '2–3 paragraphs on professional indemnity insurance implications of AI use',
    },
    clientProcurement: {
      type: 'string',
      description: '2–3 paragraphs on how clients scrutinise law firm AI use',
    },
  };

  const regulatoryMapRequired = ['sra', 'ukGdpr', 'pii', 'clientProcurement'];

  if (includeEuAiAct) {
    regulatoryMapProperties.euAiAct = {
      type: 'string',
      description: '2–3 paragraphs on EU AI Act risk classification, obligations, and compliance timeline',
    };
    regulatoryMapRequired.push('euAiAct');
  }

  return {
    name: 'generate_ai_readiness_report',
    description:
      'Output the structured CLEAR TRUST AI Readiness Report for a UK law firm based on their self-assessment responses.',
    input_schema: {
      type: 'object',
      properties: {
        cover: {
          type: 'object',
          properties: {
            firmName: { type: 'string' },
            date: { type: 'string', description: 'e.g. "August 2026"' },
            disclaimer: {
              type: 'string',
              description: '2–3 sentences: scope disclaimer stating this is an indicative self-assessment, not legal advice',
            },
          },
          required: ['firmName', 'date', 'disclaimer'],
        },
        scoreNarrative: {
          type: 'string',
          description: '4–6 paragraphs: headline score meaning, strongest dimensions, dimensions needing attention, forward-looking statement',
        },
        regulatoryMap: {
          type: 'object',
          properties: regulatoryMapProperties,
          required: regulatoryMapRequired,
        },
        shadowAi: {
          type: 'string',
          description: '2–3 paragraphs on the risk of fee-earners using unapproved AI tools and recommended governance controls',
        },
        opportunities: {
          type: 'array',
          description: '3–5 AI opportunities specific to this firm',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Concise opportunity name, 3–7 words' },
              benefit: { type: 'string', description: '1–2 sentences: concrete benefit for this firm' },
              toolCategory: { type: 'string', description: 'Category of AI tool that delivers this benefit' },
            },
            required: ['title', 'benefit', 'toolCategory'],
          },
          minItems: 3,
          maxItems: 5,
        },
        exposures: {
          type: 'array',
          description: '3–5 risk exposures for this firm',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Concise risk name, 3–7 words' },
              description: { type: 'string', description: '2–3 sentences: risk and potential consequence' },
              severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            },
            required: ['title', 'description', 'severity'],
          },
          minItems: 3,
          maxItems: 5,
        },
        upsell: {
          type: 'string',
          description: '2–3 sentences: professional invitation to discuss AI governance support with NexterLaw',
        },
      },
      required: [
        'cover',
        'scoreNarrative',
        'regulatoryMap',
        'shadowAi',
        'opportunities',
        'exposures',
        'upsell',
      ],
    },
  };
}

// ── Module-level singletons ────────────────────────────────────────────────────
// Instantiated once at module load — avoids re-creating the Anthropic client and
// rebuilding the large tool schema on every report generation call.

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_EU    = buildSystemPrompt(true);
const SYSTEM_PROMPT_NO_EU = buildSystemPrompt(false);

const REPORT_TOOL_EU    = buildReportTool(true);
const REPORT_TOOL_NO_EU = buildReportTool(false);

// ── Main export ────────────────────────────────────────────────────────────────

export async function generateReport(
  intake: IntakeData,
  scores: ClearTrustScores,
  kb: RetrievedKB,
): Promise<GenerationResult> {
  const includeEuAiAct = intake.euFacing === 'YES' || intake.euFacing === 'NOT_SURE';

  const tool         = includeEuAiAct ? REPORT_TOOL_EU    : REPORT_TOOL_NO_EU;
  const systemPrompt = includeEuAiAct ? SYSTEM_PROMPT_EU  : SYSTEM_PROMPT_NO_EU;
  const { kbText, firmText } = buildUserPromptParts(intake, scores, kb, includeEuAiAct);

  let lastError: Error = new Error('Report generation failed');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        // system as an array lets us attach cache_control to the text block.
        // Render order is tools → system → messages, so this breakpoint caches
        // the tool schema + system prompt together.
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [tool],
        tool_choice: { type: 'tool', name: 'generate_ai_readiness_report' },
        messages: [
          {
            role: 'user',
            content: [
              // KB section first with its own cache breakpoint. The prefix
              // tools+system+KB is well above Opus 4.8's 4096-token minimum.
              {
                type: 'text',
                text: kbText,
                cache_control: { type: 'ephemeral' },
              },
              // Firm profile and scores are per-request; they sit after the
              // breakpoint so they never invalidate the cached prefix.
              {
                type: 'text',
                text: firmText,
              },
            ],
          },
        ],
      });

      const toolBlock = message.content.find(b => b.type === 'tool_use') as
        | (Anthropic.Messages.ToolUseBlock & { input: GeneratedReportContent })
        | undefined;

      if (!toolBlock) {
        lastError = new Error(`Attempt ${attempt + 1}: No tool_use block in response (stop_reason=${message.stop_reason})`);
        console.error('[report-generator]', lastError.message);
        continue;
      }

      const report = toolBlock.input;

      // Hard guard: strip EU AI Act section if firm is not EU-facing
      if (!includeEuAiAct && report.regulatoryMap.euAiAct) {
        delete report.regulatoryMap.euAiAct;
      }

      const inputTokens      = message.usage.input_tokens;
      const outputTokens     = message.usage.output_tokens;
      const cacheWriteTokens = message.usage.cache_creation_input_tokens ?? 0;
      const cacheReadTokens  = message.usage.cache_read_input_tokens  ?? 0;
      const cost = estimateCost(message.model, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens);

      console.log(
        `[report-generator] model=${message.model} id=${message.id}` +
        ` input=${inputTokens} cache_write=${cacheWriteTokens} cache_read=${cacheReadTokens}` +
        ` output=${outputTokens}` +
        ` cost=$${cost.toFixed(6)}`,
      );

      return {
        report,
        rawResponse: JSON.stringify(report),
        modelUsed: message.model,
        requestId: message.id,
        inputTokens,
        outputTokens,
        cacheWriteTokens,
        cacheReadTokens,
        estimatedCostUsd: cost,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[report-generator] Attempt ${attempt + 1} API error:`, lastError.message);
    }
  }

  throw lastError;
}
