import Anthropic from '@anthropic-ai/sdk';
import type { IntakeData, ClearTrustScores, GeneratedReportContent } from '@/types';
import { CLEAR_TRUST_DIMENSIONS } from './constants';
import { RESOURCES, RESOURCE_IDS } from '@/config/resources';
import { INTAKE_QUESTIONS, intakeLabel, type IntakeAnswers, type IntakeRating } from './intake';
import { APPROVED_REFERENCES } from '../../content/approved-references';
import { mockReport } from './report-fixture';

/** Saved with every report (Submission.promptVersion). Bump when the prompt or tool schema changes. */
export const PROMPT_VERSION = '2026-11-10.v2.1';

/** Extra per-firm context added in v2. */
export interface ReportContext {
  intakeAnswers?: Partial<IntakeAnswers> | null;
  intakeRating?: IntakeRating | null;
  /** Who offers this firm's next step, exactly as the upsell paragraph must name it. */
  nextStepProvider?: string | null;
  /** Used on regeneration after the reference check fails. */
  correction?: string;
}

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

// Model can be switched by env after the comparison test (OPEN-DECISIONS #12).
const MODEL = (process.env.REPORT_MODEL ?? '').trim() || 'claude-opus-4-8';

/**
 * Local development and automated tests only: REPORT_GENERATOR_MODE=mock returns a
 * clearly-labelled sample report without calling the API. Ignored in production.
 */
export function isMockMode(): boolean {
  return process.env.REPORT_GENERATOR_MODE === 'mock' && process.env.NODE_ENV !== 'production';
}
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
  SOLE: 'Sole practitioner (just me)',
  MICRO: '2–4 fee-earners',
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
- Legal and regulatory claims must use appropriately qualified language: "may indicate", "could create", "suggests", "warrants review", "is likely to require", "may engage". Do not make definitive legal conclusions — this report is an indicative self-assessment, not legal advice.
- Quantitative statistics drawn from the knowledge base must be framed as evidence-based estimates: "research suggests", "industry benchmarking indicates", "studies show". Do not present them as established facts.
${
  includeEuAiAct
    ? ''
    : '\nIMPORTANT: Do NOT mention the EU AI Act anywhere in this report. The firm confirmed it has no EU-facing operations.'
}

GROUNDING RULE: You may only draw on the knowledge base entries provided in the user message. Do not add regulatory claims, tool names, risk descriptions, or legal guidance not present in those entries.

NOT SURE RULE: Where the firm answered "Not sure" (NOT_SURE), describe it as uncertainty to be checked; never state that the control does not exist. Only a "No" answer means the firm has said the control is absent.

CITATION RULE: Name regulatory instruments in general terms (for example "the SRA Code of Conduct", "UK GDPR", "the EU AI Act"). Do not cite pinpoint numbers (paragraph, rule, principle, article, section, annex, chapter or title numbers), even if a knowledge base entry contains one, unless the exact citation appears in this approved list: ${APPROVED_REFERENCES.length ? APPROVED_REFERENCES.map(r => r.text).join('; ') : '(none approved yet)'}.

CONTENT REQUIREMENTS:
- scoreNarrative: 4–6 paragraphs — headline score meaning, strongest dimensions, dimensions needing attention, forward-looking statement
- Each regulatoryMap field: 2–3 paragraphs
- shadowAi: 2–3 paragraphs on the risk of fee-earners using unapproved AI tools
- opportunities: 3–5 items. Each opportunity must be drawn from the knowledge base entries provided and must be directly relevant to this firm's specific practice areas and size. Do not include a generic opportunity that could apply to any law firm regardless of practice type.
- exposures: 3–5 items, severity must be HIGH, MEDIUM, or LOW. Severity must reflect the firm's actual self-assessment answers and dimension scores: where the firm answered YES to the relevant dimension, severity should be LOW or that risk should be omitted; NOT SURE warrants MEDIUM; NO warrants HIGH. Do not assign HIGH severity to a risk area where the firm's answers already demonstrate good practice.
- upsell: 2–3 sentences. Reference this firm's specific headline score, their CLEAR TRUST band (Exposed, Developing, or In Control), and at least one specific dimension where their score indicates room for improvement. Do not write a generic invitation that could apply to any firm.
- quickWins: exactly 3. Each is one concrete action the firm can take within a week, tied to one of its weakest dimensions (No first, then Not sure). Do not recommend buying a product.
- intakeNote: 2–3 sentences on how the firm handles new client enquiries, based only on its client-intake answers and the Intake Opportunity rating. Factual, no statistics, no product names. If the answers are missing, say the firm did not provide intake details.
- plan90Day: exactly 3 steps (Days 1–30, Days 31–60, Days 61–90), each building on the last and tied to the firm's weakest dimensions. Each step must pick one resourceId from the resources list in the user message that fits the step.`;
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
  ctx: ReportContext = {},
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

  const resourcesText = RESOURCES
    .map(r => `- ${r.id}: ${r.title} — ${r.description} (helps with: ${r.dimensions.join(', ')})`)
    .join('\n');

  const kbText =
    `## KNOWLEDGE BASE ENTRIES\nUse ONLY the entries below for all regulatory, risk, and tool-category claims.\n\n${kbSections}` +
    `\n\n## RESOURCES FOR THE 90-DAY PLAN\nPick resourceId values from this list only.\n${resourcesText}`;

  const dimTable = scores.dimensions
    .map(
      d =>
        `  ${d.letter}. ${d.name}: ${Math.round(d.score)}/100 (self-assessed: ${d.answer})`,
    )
    .join('\n');

  const intakeText = ctx.intakeAnswers && Object.values(ctx.intakeAnswers).some(Boolean)
    ? INTAKE_QUESTIONS.map(q => `- ${q.question} ${intakeLabel(q.key, ctx.intakeAnswers?.[q.key])}`).join('\n') +
      `\nIntake Opportunity rating: ${ctx.intakeRating ?? 'MEDIUM'}`
    : 'Not provided.';

  const reportDate = new Date().toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const firmText = `Generate a CLEAR TRUST AI Readiness Report for the following firm.

## FIRM PROFILE
- Name: ${intake.firmName}
- Website: ${intake.firmWebsite || 'Not provided'}
- Location: ${[intake.city, intake.country].filter(Boolean).join(', ')}
- Practice area(s): ${intake.practiceTypes.join(', ')}
- Firm size: ${FIRM_SIZE_LABELS[intake.firmSize as string] ?? intake.firmSize}
- EU-facing work: ${intake.euFacing}
- Report date: ${reportDate}

## CLEAR TRUST SELF-ASSESSMENT RESULTS
Headline score: ${Math.round(scores.headline)}/100 — ${scores.bandDisplayName}

Dimension scores:
${dimTable}

## CLIENT INTAKE (not part of the CLEAR TRUST score)
${intakeText}

## NEXT STEP PROVIDER
In the upsell paragraph, the organisation offering to help is: ${ctx.nextStepProvider ?? 'NexterLaw'}. Name it exactly in those words; do not name any other organisation as the one offering help.${ctx.correction ? `\n\n## CORRECTION REQUIRED\n${ctx.correction}` : ''}`;

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
          description: '2–3 sentences: professional invitation to discuss support with the organisation named under NEXT STEP PROVIDER',
        },
        quickWins: {
          type: 'array',
          description: 'Exactly 3 actions the firm can take within a week',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '3–7 words' },
              action: { type: 'string', description: '1–2 sentences: what to do and who should do it' },
              dimension: { type: 'string', enum: CLEAR_TRUST_DIMENSIONS.map(d => d.key) },
            },
            required: ['title', 'action', 'dimension'],
          },
          minItems: 3,
          maxItems: 3,
        },
        intakeNote: {
          type: 'string',
          description: "2–3 sentences on the firm's client-intake handling, from its intake answers",
        },
        plan90Day: {
          type: 'array',
          description: 'Exactly 3 steps: Days 1–30, Days 31–60, Days 61–90',
          items: {
            type: 'object',
            properties: {
              window: { type: 'string', enum: ['Days 1–30', 'Days 31–60', 'Days 61–90'] },
              title: { type: 'string', description: '3–7 words' },
              action: { type: 'string', description: '1–2 sentences' },
              resourceId: { type: 'string', enum: RESOURCE_IDS },
            },
            required: ['window', 'title', 'action', 'resourceId'],
          },
          minItems: 3,
          maxItems: 3,
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
        'quickWins',
        'intakeNote',
        'plan90Day',
      ],
    },
  };
}

// ── Module-level singletons ────────────────────────────────────────────────────
// Instantiated once at module load — avoids re-creating the Anthropic client and
// rebuilding the large tool schema on every report generation call.

// Created lazily so importing this module (tests, mock mode) never needs a key.
let anthropic: Anthropic | null = null;
function client(): Anthropic {
  anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

const SYSTEM_PROMPT_EU    = buildSystemPrompt(true);
const SYSTEM_PROMPT_NO_EU = buildSystemPrompt(false);

const REPORT_TOOL_EU    = buildReportTool(true);
const REPORT_TOOL_NO_EU = buildReportTool(false);

// ── Main export ────────────────────────────────────────────────────────────────

export async function generateReport(
  intake: IntakeData,
  scores: ClearTrustScores,
  kb: RetrievedKB,
  ctx: ReportContext = {},
): Promise<GenerationResult> {
  const includeEuAiAct = intake.euFacing === 'YES' || intake.euFacing === 'NOT_SURE';

  if (isMockMode()) {
    const report = mockReport(intake.firmName, scores, includeEuAiAct, ctx.intakeRating ?? null);
    return {
      report, rawResponse: JSON.stringify(report), modelUsed: 'mock', requestId: 'mock',
      inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, estimatedCostUsd: 0,
    };
  }

  const tool         = includeEuAiAct ? REPORT_TOOL_EU    : REPORT_TOOL_NO_EU;
  const systemPrompt = includeEuAiAct ? SYSTEM_PROMPT_EU  : SYSTEM_PROMPT_NO_EU;
  const { kbText, firmText } = buildUserPromptParts(intake, scores, kb, includeEuAiAct, ctx);

  let lastError: Error = new Error('Report generation failed');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client().messages.create({
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
      // Keep only resource ids we know, and at most 3 of each list.
      if (report.plan90Day) report.plan90Day = report.plan90Day.filter(p => RESOURCE_IDS.includes(p.resourceId)).slice(0, 3);
      if (report.quickWins) report.quickWins = report.quickWins.slice(0, 3);

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
