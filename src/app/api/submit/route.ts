import { after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { runGenerationPipeline } from '@/lib/pipeline';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/security/rate-limit';
import { generateResultToken } from '@/lib/security/tokens';
import { ConsentSchema, IntakeAnswersSchema, SelfAssessmentSchema, WebsiteSchema } from '@/lib/validation';
import { computeScores } from '@/lib/scoring';
import { intakeRating } from '@/lib/intake';
import { chooseRoute, sizeGroupUk } from '@/lib/routing';
import { isTestSubmission } from '@/lib/test-submissions';
import { SITE } from '@/config/site';

// v2 order: 10 CLEAR TRUST questions → 4 intake questions → firm details + consent.
const SubmitSchema = z.object({
  selfAssessment: SelfAssessmentSchema,
  intakeAnswers: IntakeAnswersSchema,
  details: z.object({
    firmName: z.string().trim().min(1).max(200),
    firmWebsite: WebsiteSchema,
    practiceTypes: z.array(z.string().min(1)).min(1).max(20),
    firmSize: z.enum(['SOLE', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']),
    euFacing: z.enum(['YES', 'NO', 'NOT_SURE']),
    workEmail: z.string().trim().email().max(200),
  }),
  consent: ConsentSchema,
});

export async function POST(request: Request) {
  // Every accepted submission starts a paid AI generation, so limit by IP
  // before doing any work, and by email once we know it.
  const ip = getClientIp(request);
  const ipLimit = await checkRateLimit('submitIp', ip);
  if (!ipLimit.allowed) return tooManyRequests(ipLimit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Please check the highlighted answers and try again.', issues: parsed.error.issues }, { status: 422 });
  }

  const { selfAssessment, intakeAnswers, details, consent } = parsed.data;

  const emailLimit = await checkRateLimit('submitEmail', details.workEmail);
  if (!emailLimit.allowed) return tooManyRequests(emailLimit);

  // Score, intake rating and route are all calculated without AI, so they are
  // known immediately and stored with the submission.
  const scores = computeScores(selfAssessment);
  const rating = intakeRating(intakeAnswers);
  const route = chooseRoute({
    path: 'UK',
    sizeGroup: sizeGroupUk(details.firmSize),
    euFacing: details.euFacing,
    band: scores.band,
    intakeRating: rating,
  });
  const isTest = isTestSubmission(details.workEmail, details.firmName);
  const now = new Date();

  // Lead: one per email, most recent details win (OPEN-DECISIONS N8). Consent reflects the latest choice.
  const leadData = {
    firmName: details.firmName,
    firmWebsite: details.firmWebsite,
    country: 'United Kingdom',
    consentGiven: true,
    consentAt: now,
    marketingConsent: consent.marketing,
    marketingConsentAt: consent.marketing ? now : null,
    privacyVersion: SITE.privacyVersion,
  };
  const existing = await prisma.lead.findFirst({ where: { workEmail: details.workEmail }, orderBy: { createdAt: 'desc' } });
  const lead = existing
    ? await prisma.lead.update({ where: { id: existing.id }, data: leadData })
    : await prisma.lead.create({ data: { ...leadData, workEmail: details.workEmail } });

  const submission = await prisma.submission.create({
    data: {
      leadId: lead.id,
      resultToken: generateResultToken(),
      practiceTypes: details.practiceTypes,
      firmSize: details.firmSize,
      euFacing: details.euFacing,
      answerCompliance: selfAssessment.compliance,
      answerLiteracy: selfAssessment.literacy,
      answerExplainability: selfAssessment.explainability,
      answerAccountability: selfAssessment.accountability,
      answerRights: selfAssessment.rights,
      answerTransparency: selfAssessment.transparency,
      answerReliability: selfAssessment.reliability,
      answerUsageGovernance: selfAssessment.usageGovernance,
      answerSecurity: selfAssessment.security,
      answerTraceability: selfAssessment.traceability,
      intakeOutOfHours: intakeAnswers.outOfHours || null,
      intakeReplySpeed: intakeAnswers.replySpeed || null,
      intakeVolume: intakeAnswers.volume || null,
      intakeCaseSystem: intakeAnswers.caseSystem || null,
      intakeRating: rating,
      route,
      isTest,
      status: 'PENDING',
    },
  });

  // Trigger generation.
  // Production runs on Vercel, which doesn't set URL, so the after() branch is
  // what runs live (vercel.json gives this route 300 s).
  // The Netlify background function is only used when both URL and its shared
  // secret are set; it refuses calls without the secret.
  const netlifyUrl = process.env.URL;
  const backgroundSecret = process.env.BACKGROUND_FUNCTION_SECRET;
  if (netlifyUrl && backgroundSecret) {
    await fetch(`${netlifyUrl}/.netlify/functions/generate-report-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-background-secret': backgroundSecret },
      body: JSON.stringify({ submissionId: submission.id }),
    }).catch(err => console.error('[submit] Failed to trigger background fn:', err));
  } else {
    after(async () => {
      await runGenerationPipeline(submission.id).catch(err => console.error('[submit] pipeline failed:', err));
    });
  }

  return Response.json(
    {
      submissionId: submission.id,
      resultToken: submission.resultToken,
      status: 'PENDING',
      scores: { headline: scores.headline, band: scores.band, bandDisplayName: scores.bandDisplayName, bandColour: scores.bandColour },
    },
    { status: 202 },
  );
}
