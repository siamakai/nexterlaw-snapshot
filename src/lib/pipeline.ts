import { prisma } from './db/prisma';
import { computeScores } from './scoring';
import { retrieveKnowledgeBaseEntries } from './knowledge-retrieval';
import { generateReport, PROMPT_VERSION, type GenerationResult } from './report-generator';
import { sendDay0Email, sendTeamAlert } from './email';
import { appendUsageRow } from './google-sheets';
import { pdfPathFor } from './security/report-access';
import { answersFromRow, reportColumns, scoreFieldsFor } from './report-data';
import { checkReport, stripUnapprovedCitations, unapproved, type CitationFinding } from './reference-check';
import { syncToCrm } from './crm/ghl';
import { resultsUrl } from './urls';
import { providerPhraseFor, resolveNextStep, type RouteId } from '@/config/next-steps';
import type { IntakeData, ClearTrustScores } from '@/types';
import type { IntakeRating } from './intake';

function extractErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Anthropic SDK HTTP error format: "400 {\"type\":\"error\",\"error\":{\"message\":\"...\"}}"
  if (/^\d{3}\s/.test(raw)) {
    const jsonStart = raw.indexOf('{');
    if (jsonStart !== -1) {
      try {
        const parsed = JSON.parse(raw.slice(jsonStart)) as { error?: { message?: string } };
        if (parsed.error?.message) return parsed.error.message;
      } catch {
        // fall through to raw
      }
    }
  }
  return raw;
}

/** Regenerations allowed when unapproved citations are found (spec §4.2). */
const MAX_REFERENCE_RETRIES = 2;
/** Don't start another regeneration after this long; strip instead (Vercel limit is 300 s). */
const REGENERATION_TIME_BUDGET_MS = 150_000;

export interface ReferenceOutcome {
  result: GenerationResult;
  passed: boolean;
  errors: string[];
}

/**
 * Generate, check citations, regenerate up to twice with a correction, then fall
 * back to removing unapproved citations. Exported for tests.
 */
export async function generateWithReferenceCheck(
  generate: (correction?: string) => Promise<GenerationResult>,
  startTime: number,
  now: () => number = Date.now,
): Promise<ReferenceOutcome> {
  let result = await generate();
  const history: string[] = [];

  for (let attempt = 0; ; attempt++) {
    const bad: CitationFinding[] = unapproved(checkReport(result.report));
    if (bad.length === 0) {
      return { result, passed: history.length === 0, errors: history };
    }
    history.push(...bad.map(b => `attempt ${attempt + 1}: unapproved citation "${b.citation}" in ${b.path}`));

    const outOfTime = now() - startTime > REGENERATION_TIME_BUDGET_MS;
    if (attempt >= MAX_REFERENCE_RETRIES || outOfTime) {
      const report = stripUnapprovedCitations(result.report);
      history.push(outOfTime ? 'time budget reached: citations removed' : 'retries exhausted: citations removed');
      return { result: { ...result, report, rawResponse: JSON.stringify(report) }, passed: false, errors: history };
    }

    const list = [...new Set(bad.map(b => b.citation))].join('; ');
    result = await generate(
      `Your previous draft cited these pinpoint references, which are not on the approved list: ${list}. ` +
      'Rewrite without any pinpoint paragraph, rule, principle, article, section, annex, chapter or title numbers; name the instrument only.',
    );
  }
}

export async function runGenerationPipeline(submissionId: string): Promise<void> {
  const startTime = Date.now();

  // ── 0. Claim the submission ─────────────────────────────────────────────────
  // Atomically move PENDING → SCORING. If nothing was claimed, another run has
  // already started or finished this submission: do nothing, so a repeated
  // trigger can never pay for a second AI generation or overwrite a finished
  // report. (Outside the try so a skipped run never marks it FAILED.)
  const claimed = await prisma.submission.updateMany({
    where: { id: submissionId, status: 'PENDING' },
    data: { status: 'SCORING' },
  });
  if (claimed.count === 0) {
    console.warn(`[pipeline] Submission ${submissionId} is not PENDING; skipping duplicate run.`);
    return;
  }

  let firmName = '';
  try {
    const submission = await prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { lead: true },
    });
    firmName = submission.lead.firmName;

    // ── 1. Scoring (no AI; the score always exists even if generation fails) ──
    const scores: ClearTrustScores = computeScores(answersFromRow(submission));
    await prisma.submission.update({
      where: { id: submissionId },
      data: { ...scoreFieldsFor(scores), status: 'RETRIEVING' },
    });

    // ── 2. Knowledge-base retrieval ─────────────────────────────────────────
    const includeEuLayer = submission.euFacing === 'YES' || submission.euFacing === 'NOT_SURE';
    const kb = await retrieveKnowledgeBaseEntries({
      practiceTypes: submission.practiceTypes,
      // KB entries are tagged by the original five sizes; sole practitioners use the smallest.
      firmSize: submission.firmSize === 'SOLE' ? 'MICRO' : submission.firmSize,
      includeEuLayer,
    });

    // ── 3. Report generation + reference check ──────────────────────────────
    await prisma.submission.update({ where: { id: submissionId }, data: { status: 'GENERATING' } });

    const intake: IntakeData = {
      firmName: submission.lead.firmName,
      firmWebsite: submission.lead.firmWebsite,
      city: submission.lead.city ?? '',
      country: submission.lead.country,
      practiceTypes: submission.practiceTypes,
      firmSize: submission.firmSize,
      euFacing: submission.euFacing,
      workEmail: submission.lead.workEmail,
    };
    const ctx = {
      intakeAnswers: {
        outOfHours: submission.intakeOutOfHours ?? '',
        replySpeed: submission.intakeReplySpeed ?? '',
        volume: submission.intakeVolume ?? '',
        caseSystem: submission.intakeCaseSystem ?? '',
      },
      intakeRating: (submission.intakeRating as IntakeRating | null) ?? null,
      nextStepProvider: providerPhraseFor(submission.route as RouteId | null),
    };

    const { result, passed, errors } = await generateWithReferenceCheck(
      correction => generateReport(intake, scores, kb, { ...ctx, correction }),
      startTime,
    );
    const generationTimeMs = Date.now() - startTime;

    // ── 4. Log API usage ────────────────────────────────────────────────────
    const totalTokens = result.inputTokens + result.cacheWriteTokens + result.cacheReadTokens + result.outputTokens;
    console.log(
      `[pipeline] API usage — model=${result.modelUsed} requestId=${result.requestId}` +
      ` input=${result.inputTokens} cache_write=${result.cacheWriteTokens} cache_read=${result.cacheReadTokens}` +
      ` output=${result.outputTokens} total=${totalTokens}` +
      ` cost=$${result.estimatedCostUsd.toFixed(6)} timeMs=${generationTimeMs} references=${passed ? 'pass' : 'fixed'}`,
    );
    if (!submission.isTest) {
      appendUsageRow({
        timestamp: new Date().toISOString(),
        submissionId,
        firmName: submission.lead.firmName,
        workEmail: submission.lead.workEmail,
        modelUsed: result.modelUsed,
        requestId: result.requestId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens,
        estimatedCostUsd: result.estimatedCostUsd,
        generationTimeMs,
        clearTrustScore: Math.round(scores.headline),
        scoreBand: scores.band,
      }).catch(err => console.error('[pipeline] Google Sheets log failed:', err));
    }

    // ── 5. Persist report ───────────────────────────────────────────────────
    const pdfUrl = pdfPathFor(submission);
    await prisma.$transaction([
      prisma.generatedReport.create({
        data: {
          submissionId,
          ...reportColumns(result.report),
          rawClaudeResponse: result.rawResponse,
          validationPassed: passed,
          validationErrors: errors,
          modelUsed: result.modelUsed,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          generationTimeMs,
        },
      }),
      prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'SENDING_EMAIL', generatedAt: new Date(), pdfUrl, promptVersion: PROMPT_VERSION },
      }),
    ]);

    // ── 6. Day 0 email (non-fatal) ──────────────────────────────────────────
    const link = submission.resultToken ? resultsUrl(submission.resultToken) : null;
    const nextStep = submission.route ? resolveNextStep(submission.route as RouteId) : null;
    await sendDay0Email({
      to: submission.lead.workEmail,
      firmName: submission.lead.firmName,
      scores,
      pdfUrl,
      resultsUrl: link,
      nextStep,
    }).catch(err => console.error('[pipeline] Day 0 email failed:', err));

    await prisma.submission.update({ where: { id: submissionId }, data: { status: 'COMPLETE' } });

    // ── 7. CRM (non-fatal; skipped for tests; mock until GO) ────────────────
    try {
      const crm = await syncToCrm({
        event: 'snapshot_completed',
        email: submission.lead.workEmail,
        firmName: submission.lead.firmName,
        firmWebsite: submission.lead.firmWebsite,
        country: submission.lead.country,
        path: 'uk',
        band: scores.band,
        score: scores.headline,
        sizeKey: submission.firmSize,
        intakeRating: submission.intakeRating,
        euFacing: submission.euFacing,
        route: submission.route,
        resultsUrl: link,
        marketingConsent: submission.lead.marketingConsent,
        isTest: submission.isTest,
      });
      if (crm.sent) {
        await prisma.lead.update({ where: { id: submission.leadId }, data: { crmTagged: true, crmTaggedAt: new Date() } });
      }
    } catch (err) {
      console.error('[pipeline] CRM sync failed:', err);
    }
  } catch (err) {
    const reason = extractErrorMessage(err);
    await prisma.submission
      .update({ where: { id: submissionId }, data: { status: 'FAILED', failureReason: reason } })
      .catch(() => {});
    // Tell the team so the firm still gets its report (spec: "the submission is kept").
    await sendTeamAlert(
      `Snapshot report failed${firmName ? ` — ${firmName}` : ''}`,
      `Report generation failed for submission ${submissionId}. The firm was told the full report will follow by email. ` +
      'Open Admin → Submissions and press "Retry" once the cause is fixed.',
    ).catch(() => {});
    throw err;
  }
}
