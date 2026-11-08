// Sample report used ONLY in mock mode (local development and automated tests).
// It is never used in production (see isMockMode in report-generator.ts) and
// every section says it is sample text.

import type { ClearTrustScores, GeneratedReportContent, ReportPlanStep } from '@/types';
import type { IntakeRating } from './intake';

const SAMPLE = '[Sample text for testing — not a real report.]';

export function mockReport(
  firmName: string,
  scores: ClearTrustScores,
  includeEuAiAct: boolean,
  intakeRating: IntakeRating | null,
): GeneratedReportContent {
  const weakest = [...scores.dimensions].sort((a, b) => a.score - b.score).slice(0, 3);
  const plan: ReportPlanStep[] = [
    { window: 'Days 1–30', title: 'Name an owner for AI use', action: `${SAMPLE} Agree who is accountable for AI use and record it.`, resourceId: 'course-responsible-ai' },
    { window: 'Days 31–60', title: 'Write a short AI-use position', action: `${SAMPLE} Set out which tools and data are permitted.`, resourceId: 'podcast-mohammad-shaire' },
    { window: 'Days 61–90', title: 'Train the team and check outputs', action: `${SAMPLE} Brief fee-earners and add a verification step.`, resourceId: 'course-ai-law' },
  ];
  return {
    cover: { firmName, date: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), disclaimer: `${SAMPLE} Indicative self-assessment only; not legal advice.` },
    scoreNarrative: `${SAMPLE}\n\n${firmName} scored ${Math.round(scores.headline)}/100, in the ${scores.bandDisplayName} band.\n\nThe dimensions needing most attention are ${weakest.map(w => w.name).join(', ')}.`,
    regulatoryMap: {
      sra: `${SAMPLE} The SRA expects firms to supervise the tools they use.`,
      ukGdpr: `${SAMPLE} UK GDPR applies when client personal data is entered into AI tools.`,
      pii: `${SAMPLE} Insurers may ask how AI-assisted work is checked.`,
      clientProcurement: `${SAMPLE} Clients increasingly ask firms about their AI use.`,
      ...(includeEuAiAct ? { euAiAct: `${SAMPLE} The EU AI Act may be relevant to EU-facing work.` } : {}),
    },
    shadowAi: `${SAMPLE} Staff may be using AI tools the firm has not approved.`,
    opportunities: [
      { title: 'Faster first drafts', benefit: `${SAMPLE} Drafting support for routine documents.`, toolCategory: 'Drafting assistants' },
      { title: 'Quicker research summaries', benefit: `${SAMPLE} Summaries of long documents.`, toolCategory: 'Research tools' },
      { title: 'Responsive client intake', benefit: `${SAMPLE} Faster replies to new enquiries.`, toolCategory: 'Intake automation' },
    ],
    exposures: weakest.map(w => ({
      title: `${w.name} gap`,
      description: `${SAMPLE} Answer given: ${w.answer === 'NOT_SURE' ? 'Not sure (uncertain, to be checked)' : w.answer}.`,
      severity: w.answer === 'NO' ? 'HIGH' as const : w.answer === 'NOT_SURE' ? 'MEDIUM' as const : 'LOW' as const,
    })),
    upsell: `${SAMPLE} With a score of ${Math.round(scores.headline)} (${scores.bandDisplayName}), a short review of ${weakest[0]?.name ?? 'your weakest area'} would be a sensible next step.`,
    quickWins: weakest.map(w => ({ title: `Quick check: ${w.name}`, action: `${SAMPLE} One small action to improve ${w.name}.`, dimension: w.key })),
    intakeNote: `${SAMPLE} Intake Opportunity rating: ${intakeRating ?? 'not provided'}.`,
    plan90Day: plan,
  };
}
