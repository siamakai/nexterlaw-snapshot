import { after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { runGenerationPipeline } from '@/lib/pipeline';

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

  // Trigger background generation.
  // On Netlify: URL env var is set automatically → calls the 15-min background function.
  // In local dev (no URL set): falls back to in-process execution via after().
  const netlifyUrl = process.env.URL;
  if (netlifyUrl) {
    // Fire-and-forget: Netlify immediately returns 202 before the function runs.
    fetch(`${netlifyUrl}/.netlify/functions/generate-report-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: submission.id }),
    }).catch(err => console.error('[submit] Failed to trigger background fn:', err));
  } else {
    // Local dev fallback
    after(async () => {
      await runGenerationPipeline(submission.id);
    });
  }

  return Response.json({ submissionId: submission.id, status: 'PENDING' }, { status: 202 });
}
