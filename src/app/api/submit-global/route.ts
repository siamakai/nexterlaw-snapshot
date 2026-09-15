import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { sendGlobalSubmissionNotification } from '@/lib/email';

const AnswerEnum = z.enum(['YES', 'NO', 'NOT_SURE']);
const YesNoEnum = z.enum(['YES', 'NO']);

const SubmitGlobalSchema = z.object({
  contact: z.object({
    contactName: z.string().min(1).max(200),
    firmName: z.string().min(1).max(200),
    firmWebsite: z.string().max(500).default(''),
    workEmail: z.string().email().max(200),
    phone: z.string().max(50).default(''),
  }),
  jurisdiction: z.object({
    country: z.string().min(1).max(100),
    stateProvince: z.string().max(100).default(''),
    secondaryStates: z.array(z.string().min(1)).max(20).default([]),
    regulatoryBody: z.string().max(300).default(''),
    secondaryJurisdiction: z.string().max(300).default(''),
  }),
  firmProfile: z.object({
    firmSize: z.string().min(1).max(50),
    primaryPracticeArea: z.string().min(1).max(100),
    primaryPracticeAreaOther: z.string().max(200).default(''),
    secondaryPracticeAreas: z.array(z.string().min(1)).max(20).default([]),
  }),
  currentAiUse: z.object({
    currentlyUsingAi: AnswerEnum,
    aiToolsInUse: z.string().max(2000).default(''),
    hasAiPolicy: AnswerEnum,
    clientsAskedAboutAi: AnswerEnum,
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
  additionalContext: z.object({
    biggestConcern: z.string().max(2000).default(''),
    whatWouldHelpMost: z.string().max(2000).default(''),
    contactPermission: YesNoEnum,
  }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SubmitGlobalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { contact, jurisdiction, firmProfile, currentAiUse, selfAssessment, additionalContext } = parsed.data;

  const submission = await prisma.globalSubmission.create({
    data: {
      contactName: contact.contactName,
      firmName: contact.firmName,
      firmWebsite: contact.firmWebsite || null,
      workEmail: contact.workEmail,
      phone: contact.phone || null,

      country: jurisdiction.country,
      stateProvince: jurisdiction.stateProvince || null,
      secondaryStates: jurisdiction.secondaryStates,
      regulatoryBody: jurisdiction.regulatoryBody || null,
      secondaryJurisdiction: jurisdiction.secondaryJurisdiction || null,

      firmSize: firmProfile.firmSize,
      primaryPracticeArea: firmProfile.primaryPracticeArea,
      primaryPracticeAreaOther: firmProfile.primaryPracticeAreaOther || null,
      secondaryPracticeAreas: firmProfile.secondaryPracticeAreas,

      currentlyUsingAi: currentAiUse.currentlyUsingAi,
      aiToolsInUse: currentAiUse.aiToolsInUse || null,
      hasAiPolicy: currentAiUse.hasAiPolicy,
      clientsAskedAboutAi: currentAiUse.clientsAskedAboutAi,

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

      biggestConcern: additionalContext.biggestConcern || null,
      whatWouldHelpMost: additionalContext.whatWouldHelpMost || null,
      contactPermission: additionalContext.contactPermission === 'YES',
      consentAt: new Date(),

      status: 'PENDING',
    },
  });

  // Notify the internal team inline — this is a fast DB write with no
  // generation pipeline behind it, unlike the UK flow's /api/submit, so there's
  // no need for a background function. Non-fatal: a failed notification email
  // must not fail the submitter's request.
  try {
    await sendGlobalSubmissionNotification({
      submissionId: submission.id,
      contactName: contact.contactName,
      firmName: contact.firmName,
      workEmail: contact.workEmail,
      country: jurisdiction.country,
      stateProvince: jurisdiction.stateProvince,
      primaryPracticeArea: firmProfile.primaryPracticeArea,
    });
  } catch (err) {
    console.error('[submit-global] Internal notification email failed:', err);
  }

  return Response.json({ submissionId: submission.id }, { status: 201 });
}
