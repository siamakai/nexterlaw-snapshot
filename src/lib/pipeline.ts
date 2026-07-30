import { prisma } from './db/prisma';
import { computeScores } from './scoring';
import { retrieveKnowledgeBaseEntries } from './knowledge-retrieval';
import { generateReport } from './report-generator';
import { sendDay0Email } from './email';
import { appendUsageRow } from './google-sheets';
import type { SelfAssessmentAnswers, IntakeData } from '@/types';

function extractErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Anthropic SDK error format: "400 {\"type\":\"error\",\"error\":{\"message\":\"...\"}}"
  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as { error?: { message?: string } };
      if (parsed.error?.message) return parsed.error.message;
    } catch {
      // fall through to raw
    }
  }
  return raw;
}

export async function runGenerationPipeline(submissionId: string): Promise<void> {
  const startTime = Date.now();

  try {
    const submission = await prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { lead: true },
    });

    // ── 1. Scoring ───────────────────────────────────────────────────────────
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'SCORING' },
    });

    const answers: SelfAssessmentAnswers = {
      compliance: submission.answerCompliance,
      literacy: submission.answerLiteracy,
      explainability: submission.answerExplainability,
      accountability: submission.answerAccountability,
      rights: submission.answerRights,
      transparency: submission.answerTransparency,
      reliability: submission.answerReliability,
      usageGovernance: submission.answerUsageGovernance,
      security: submission.answerSecurity,
      traceability: submission.answerTraceability,
    };

    const scores = computeScores(answers, submission.firmSize, submission.practiceTypes);

    const scoreFields: Record<string, number | string | undefined> = {
      scoreBand: scores.band,
      scoreHeadline: scores.headline,
    };
    for (const d of scores.dimensions) {
      scoreFields[`score${d.key.charAt(0).toUpperCase()}${d.key.slice(1)}`] = d.score;
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: { ...scoreFields, status: 'RETRIEVING' },
    });

    // ── 2. Knowledge-base retrieval ──────────────────────────────────────────
    const includeEuLayer =
      submission.euFacing === 'YES' || submission.euFacing === 'NOT_SURE';

    const kb = await retrieveKnowledgeBaseEntries({
      practiceTypes: submission.practiceTypes,
      firmSize: submission.firmSize,
      includeEuLayer,
    });

    // ── 3. Claude report generation ──────────────────────────────────────────
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'GENERATING' },
    });

    const intake: IntakeData = {
      firmName: submission.lead.firmName,
      firmWebsite: submission.lead.firmWebsite,
      city: submission.lead.city,
      country: submission.lead.country,
      practiceTypes: submission.practiceTypes,
      firmSize: submission.firmSize,
      euFacing: submission.euFacing,
      workEmail: submission.lead.workEmail,
    };

    const result = await generateReport(intake, scores, kb);
    const generationTimeMs = Date.now() - startTime;

    // ── 4. Log API usage ─────────────────────────────────────────────────────
    const totalTokens = result.inputTokens + result.outputTokens;
    console.log(
      `[pipeline] API usage — model=${result.modelUsed} requestId=${result.requestId}` +
      ` input=${result.inputTokens} output=${result.outputTokens} total=${totalTokens}` +
      ` cost=$${result.estimatedCostUsd.toFixed(6)} timeMs=${generationTimeMs}`,
    );

    // Write to Google Sheet (non-fatal)
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

    // ── 5. Persist report ────────────────────────────────────────────────────
    await prisma.generatedReport.create({
      data: {
        submissionId,
        coverJson: result.report.cover,
        scoreNarrativeJson: result.report.scoreNarrative,
        regulatoryMapJson: result.report.regulatoryMap,
        shadowAiJson: result.report.shadowAi,
        opportunitiesJson: JSON.parse(JSON.stringify(result.report.opportunities)),
        exposuresJson: JSON.parse(JSON.stringify(result.report.exposures)),
        upsellJson: result.report.upsell,
        rawClaudeResponse: result.rawResponse,
        validationPassed: true,
        modelUsed: result.modelUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        generationTimeMs,
      },
    });

    const pdfUrl = `/api/report/${submissionId}/pdf`;

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'SENDING_EMAIL', generatedAt: new Date(), pdfUrl },
    });

    // Day 0 email — non-fatal; pipeline still completes if email fails
    await sendDay0Email({
      to: submission.lead.workEmail,
      firmName: submission.lead.firmName,
      scores,
      submissionId,
      pdfUrl,
    }).catch(err => console.error('[pipeline] Day 0 email failed:', err));

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'COMPLETE' },
    });
  } catch (err) {
    const reason = extractErrorMessage(err);
    await prisma.submission
      .update({ where: { id: submissionId }, data: { status: 'FAILED', failureReason: reason } })
      .catch(() => {});
    throw err;
  }
}
