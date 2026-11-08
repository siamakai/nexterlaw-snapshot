// AI first draft of a Global Snapshot report (spec §2, Global step 4).
// The draft is ONLY a starting point for the team: it is stored on the
// submission, edited and approved in /admin/global-submissions/[id], and nothing
// reaches the firm until a person approves it.

import Anthropic from '@anthropic-ai/sdk';
import type { GlobalSubmission } from '@prisma/client';
import { notesFor } from '../../content/jurisdictions';
import { CLEAR_TRUST_DIMENSIONS } from './constants';
import { RESOURCES, RESOURCE_IDS } from '@/config/resources';
import { answersFromRow } from './report-data';
import { computeScores } from './scoring';
import { isMockMode, PROMPT_VERSION } from './report-generator';
import { mockReport } from './report-fixture';
import { stripUnapprovedCitations, checkReport, unapproved } from './reference-check';
import { INTAKE_QUESTIONS, intakeLabel, type IntakeRating } from './intake';
import type { GeneratedReportContent } from '@/types';

const MODEL = (process.env.REPORT_MODEL ?? '').trim() || 'claude-opus-4-8';

export interface GlobalDraft {
  content: GeneratedReportContent;
  model: string;
  promptVersion: string;
  hadJurisdictionNotes: boolean;
  citationWarnings: string[];
}

const SYSTEM = `You are drafting a CLEAR TRUST AI Readiness Report for a law firm outside the UK. A member of the NexterLaw team will review, correct and approve your draft before the firm sees it.

RULES:
- British English. Professional, measured, no marketing hyperbole. Address the firm as "your firm".
- You may only state jurisdiction-specific legal or regulatory points that appear in the JURISDICTION NOTES. If there are no notes, write in general terms about professional-regulator expectations, data protection and confidentiality, and mark every place the reviewer must add country detail with "[REVIEWER: add {country} specifics]".
- Never cite pinpoint paragraph, rule, article or section numbers.
- Where the firm answered "Not sure", describe it as uncertainty to be checked, never as an absent control.
- This is general information, not legal advice; use qualified language ("may", "is likely to", "warrants review").
- regulatoryMap slots mean: sra = professional regulator / bar expectations; ukGdpr = data protection and confidentiality; pii = professional indemnity / insurance; clientProcurement = client expectations. Leave euAiAct out unless the notes say it applies.`;

function tool(): Anthropic.Tool {
  const str = (description: string) => ({ type: 'string', description });
  return {
    name: 'draft_global_snapshot_report',
    description: 'Draft the Global CLEAR TRUST report for human review.',
    input_schema: {
      type: 'object',
      properties: {
        cover: { type: 'object', properties: { firmName: str('firm'), date: str('e.g. "November 2026"'), disclaimer: str('2–3 sentences') }, required: ['firmName', 'date', 'disclaimer'] },
        scoreNarrative: str('3–5 paragraphs'),
        regulatoryMap: { type: 'object', properties: { sra: str('2 paragraphs'), ukGdpr: str('2 paragraphs'), pii: str('1–2 paragraphs'), clientProcurement: str('1–2 paragraphs') }, required: ['sra', 'ukGdpr', 'pii', 'clientProcurement'] },
        shadowAi: str('2 paragraphs'),
        opportunities: { type: 'array', minItems: 3, maxItems: 4, items: { type: 'object', properties: { title: str('3–7 words'), benefit: str('1–2 sentences'), toolCategory: str('tool category') }, required: ['title', 'benefit', 'toolCategory'] } },
        exposures: { type: 'array', minItems: 3, maxItems: 4, items: { type: 'object', properties: { title: str('3–7 words'), description: str('2 sentences'), severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] } }, required: ['title', 'description', 'severity'] } },
        upsell: str('2 sentences referencing the score and one weak dimension'),
        quickWins: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { title: str('3–7 words'), action: str('1–2 sentences'), dimension: { type: 'string', enum: CLEAR_TRUST_DIMENSIONS.map(d => d.key) } }, required: ['title', 'action', 'dimension'] } },
        intakeNote: str('2–3 sentences from the intake answers'),
        plan90Day: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { window: { type: 'string', enum: ['Days 1–30', 'Days 31–60', 'Days 61–90'] }, title: str('3–7 words'), action: str('1–2 sentences'), resourceId: { type: 'string', enum: RESOURCE_IDS } }, required: ['window', 'title', 'action', 'resourceId'] } },
      },
      required: ['cover', 'scoreNarrative', 'regulatoryMap', 'shadowAi', 'opportunities', 'exposures', 'upsell', 'quickWins', 'intakeNote', 'plan90Day'],
    },
  };
}

export async function generateGlobalDraft(s: GlobalSubmission): Promise<GlobalDraft> {
  const scores = computeScores(answersFromRow(s));
  const notes = notesFor(s.country);

  if (isMockMode()) {
    const content = mockReport(s.firmName, scores, false, (s.intakeRating as IntakeRating | null) ?? null);
    return { content, model: 'mock', promptVersion: PROMPT_VERSION, hadJurisdictionNotes: !!notes, citationWarnings: [] };
  }

  const dims = scores.dimensions.map(d => `  ${d.letter}. ${d.name}: ${d.answer}`).join('\n');
  const intake = INTAKE_QUESTIONS.map(q => {
    const field = { outOfHours: s.intakeOutOfHours, replySpeed: s.intakeReplySpeed, volume: s.intakeVolume, caseSystem: s.intakeCaseSystem }[q.key];
    return `- ${q.question} ${intakeLabel(q.key, field)}`;
  }).join('\n');

  const user = `## JURISDICTION NOTES (${s.country}${s.stateProvince ? `, ${s.stateProvince}` : ''})
${notes ?? 'None yet. Write in general terms and mark gaps for the reviewer.'}

## RESOURCES FOR THE 90-DAY PLAN
${RESOURCES.map(r => `- ${r.id}: ${r.title}`).join('\n')}

## FIRM
- Name: ${s.firmName}
- Country: ${s.country}${s.stateProvince ? ` (${s.stateProvince})` : ''}${s.regulatoryBody ? `\n- Regulator named by the firm: ${s.regulatoryBody}` : ''}
- Size: ${s.firmSize}
- Practice: ${s.primaryPracticeArea === 'other' ? s.primaryPracticeAreaOther : s.primaryPracticeArea}${s.secondaryPracticeAreas.length ? `; also ${s.secondaryPracticeAreas.join(', ')}` : ''}
- Using AI now: ${s.currentlyUsingAi}${s.aiToolsInUse ? ` (${s.aiToolsInUse})` : ''}; formal AI policy: ${s.hasAiPolicy}; clients have asked about AI: ${s.clientsAskedAboutAi}
- Biggest concern: ${s.biggestConcern ?? 'not given'}
- What would help most: ${s.whatWouldHelpMost ?? 'not given'}

## CLEAR TRUST ANSWERS (score ${Math.round(scores.headline)}/100, ${scores.bandDisplayName})
${dims}

## CLIENT INTAKE
${intake}
Intake Opportunity rating: ${s.intakeRating ?? 'not provided'}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 12000,
    system: SYSTEM,
    tools: [tool()],
    tool_choice: { type: 'tool', name: 'draft_global_snapshot_report' },
    messages: [{ role: 'user', content: user }],
  });
  const block = message.content.find(b => b.type === 'tool_use') as (Anthropic.Messages.ToolUseBlock & { input: GeneratedReportContent }) | undefined;
  if (!block) throw new Error(`No draft returned (stop_reason=${message.stop_reason})`);

  // Humans review every draft, so strip pinpoints rather than regenerate, and flag them.
  const warnings = unapproved(checkReport(block.input)).map(f => `removed citation "${f.citation}" in ${f.path}`);
  return {
    content: stripUnapprovedCitations(block.input),
    model: message.model,
    promptVersion: PROMPT_VERSION,
    hadJurisdictionNotes: !!notes,
    citationWarnings: warnings,
  };
}
