import { after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { runGenerationPipeline } from '@/lib/pipeline';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/security/rate-limit';
import { generateResultToken } from '@/lib/security/tokens';

const AnswerEnum = z.enum(['YES', 'NO', 'NOT_SURE']);

const SubmitSchema = z.object({
  intake: z.object({
    firmName: z.string().min(1).max(200),
    firmWebsite: z.string().max(500).default(''),
    city: z.string().min(1).max(100),
    country: z.string().min(1).max(100),
    practiceTypes: z.array(z.string().min(1)).min(1).max(20),
    firmSize: z.enum(['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']),
    euFacing: z.enum(['YES', 'NO', 'NOT_SURE']),
    workEmail: z.string().email().max(200),
  }),
  selfAssessment: z.object({
    compliance: AnswerEnum,
    literacy: AnswerEnum,
    explainability: AnswerEnum,
    accountability: AnswerEnum,
    rights: AnswerEnum,
    transparency: AnswerEnum,
    reliability: AnswerEnum,
    usageGovernance: AnswerEnum,
    security: AnswerEnum,
    traceability: AnswerEnum,
  }),
  consentGiven: z.literal(true),
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
    return Response.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { intake, selfAssessment } = parsed.data;

  const emailLimit = await checkRateLimit('submitEmail', intake.workEmail);
  if (!emailLimit.allowed) return tooManyRequests(emailLimit);

  // Upsert Lead by email — most recent record wins
  let lead = await prisma.lead.findFirst({
    where: { workEmail: intake.workEmail },
    orderBy: { createdAt: 'desc' },
  });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        firmName: intake.firmName,
        firmWebsite: intake.firmWebsite,
        city: intake.city,
        country: intake.country,
        workEmail: intake.workEmail,
        consentGiven: true,
        consentAt: new Date(),
      },
    });
  } else {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        firmName: intake.firmName,
        firmWebsite: intake.firmWebsite,
        city: intake.city,
        country: intake.country,
        consentGiven: true,
        consentAt: new Date(),
      },
    });
  }

  const submission = await prisma.submission.create({
    data: {
      leadId: lead.id,
      resultToken: generateResultToken(),
      practiceTypes: intake.practiceTypes,
      firmSize: intake.firmSize,
      euFacing: intake.euFacing,
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
    // Netlify returns 202 immediately for background functions, so awaiting is cheap
    // and makes sure the trigger isn't dropped when this function returns.
    await fetch(`${netlifyUrl}/.netlify/functions/generate-report-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-background-secret': backgroundSecret },
      body: JSON.stringify({ submissionId: submission.id }),
    }).catch(err => console.error('[submit] Failed to trigger background fn:', err));
  } else {
    after(async () => {
      await runGenerationPipeline(submission.id);
    });
  }

  return Response.json(
    { submissionId: submission.id, resultToken: submission.resultToken, status: 'PENDING' },
    { status: 202 },
  );
}
