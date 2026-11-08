import { after } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { sendGlobalAcknowledgement, sendGlobalSubmissionNotification } from '@/lib/email';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/security/rate-limit';
import { generateResultToken } from '@/lib/security/tokens';
import { AnswerEnum, ConsentSchema, IntakeAnswersSchema, SelfAssessmentSchema, WebsiteSchema } from '@/lib/validation';
import { computeScores } from '@/lib/scoring';
import { intakeRating } from '@/lib/intake';
import { isTestSubmission } from '@/lib/test-submissions';
import { syncToCrm } from '@/lib/crm/ghl';
import { generateGlobalDraft } from '@/lib/global-draft';
import { isMockMode } from '@/lib/report-generator';
import { formatDue } from '@/lib/dates';
import { SITE } from '@/config/site';

const SubmitGlobalSchema = z.object({
  contact: z.object({
    contactName: z.string().trim().min(1).max(200),
    firmName: z.string().trim().min(1).max(200),
    firmWebsite: WebsiteSchema,
    workEmail: z.string().trim().email().max(200),
    phone: z.string().trim().max(50).default(''),
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
  selfAssessment: SelfAssessmentSchema,
  intakeAnswers: IntakeAnswersSchema,
  additionalContext: z.object({
    biggestConcern: z.string().max(2000).default(''),
    whatWouldHelpMost: z.string().max(2000).default(''),
  }),
  consent: ConsentSchema,
  /** The firm's IANA time zone (from the browser), for the due-date wording. */
  timeZone: z.string().max(64).default('Europe/London'),
});

export async function POST(request: Request) {
  // Each submission emails the team, so limit spam by IP and by email.
  const ipLimit = await checkRateLimit('submitGlobalIp', getClientIp(request));
  if (!ipLimit.allowed) return tooManyRequests(ipLimit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SubmitGlobalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Please check the highlighted answers and try again.', issues: parsed.error.issues }, { status: 422 });
  }

  const { contact, jurisdiction, firmProfile, currentAiUse, selfAssessment, intakeAnswers, additionalContext, consent, timeZone } = parsed.data;

  const emailLimit = await checkRateLimit('submitGlobalEmail', contact.workEmail);
  if (!emailLimit.allowed) return tooManyRequests(emailLimit);

  const scores = computeScores(selfAssessment);
  const rating = intakeRating(intakeAnswers);
  const isTest = isTestSubmission(contact.workEmail, contact.firmName);
  const now = new Date();
  // Waitlist: no promise of a date while the team is at capacity.
  const dueAt = SITE.global.waitlist ? null : new Date(now.getTime() + SITE.global.turnaroundHours * 3600_000);
  const dueText = dueAt ? formatDue(dueAt, timeZone) : null;

  const submission = await prisma.globalSubmission.create({
    data: {
      resultToken: generateResultToken(),
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

      intakeOutOfHours: intakeAnswers.outOfHours || null,
      intakeReplySpeed: intakeAnswers.replySpeed || null,
      intakeVolume: intakeAnswers.volume || null,
      intakeCaseSystem: intakeAnswers.caseSystem || null,
      intakeRating: rating,
      route: 'GLOBAL',

      scoreHeadline: scores.headline,
      scoreBand: scores.band,

      biggestConcern: additionalContext.biggestConcern || null,
      whatWouldHelpMost: additionalContext.whatWouldHelpMost || null,
      // Kept for the existing admin screens: same meaning as marketing consent.
      contactPermission: consent.marketing,
      consentAt: now,
      marketingConsent: consent.marketing,
      marketingConsentAt: consent.marketing ? now : null,
      privacyVersion: SITE.privacyVersion,
      isTest,
      dueAt,
      status: 'PENDING',
    },
  });

  // Emails, CRM and the AI draft run after the response, so the firm isn't kept waiting.
  after(async () => {
    try {
      await sendGlobalAcknowledgement({
        to: contact.workEmail,
        contactName: contact.contactName,
        country: jurisdiction.country,
        dueText: dueText ?? 'as soon as a slot opens',
        scores: SITE.global.showScore ? scores : null,
      });
      await prisma.globalSubmission.update({ where: { id: submission.id }, data: { acknowledgedAt: new Date() } });
    } catch (err) {
      console.error('[submit-global] Acknowledgement email failed:', err);
    }

    await sendGlobalSubmissionNotification({
      submissionId: submission.id,
      contactName: contact.contactName,
      firmName: contact.firmName,
      workEmail: contact.workEmail,
      country: jurisdiction.country,
      stateProvince: jurisdiction.stateProvince,
      primaryPracticeArea: firmProfile.primaryPracticeArea,
      dueText: dueText ?? 'waitlist',
      isTest,
    }).catch(err => console.error('[submit-global] Team notification failed:', err));

    await syncToCrm({
      event: 'global_submitted',
      email: contact.workEmail,
      firmName: contact.firmName,
      firmWebsite: contact.firmWebsite,
      contactName: contact.contactName,
      phone: contact.phone,
      country: jurisdiction.country,
      path: 'global',
      band: scores.band,
      score: scores.headline,
      sizeKey: firmProfile.firmSize,
      intakeRating: rating,
      route: 'GLOBAL',
      marketingConsent: consent.marketing,
      isTest,
      dueAt,
    }).catch(err => console.error('[submit-global] CRM sync failed:', err));

    // AI first draft for the reviewer. Skipped for test submissions unless in mock mode (no cost).
    if (!isTest || isMockMode()) {
      try {
        const draft = await generateGlobalDraft(submission);
        await prisma.globalSubmission.update({
          where: { id: submission.id },
          data: { reportDraftJson: draft as unknown as Prisma.InputJsonValue, reportDraftAt: new Date(), status: 'RESEARCHING' },
        });
      } catch (err) {
        console.error('[submit-global] AI draft failed (team can still write the report by hand):', err);
      }
    }
  });

  return Response.json(
    {
      submissionId: submission.id,
      resultToken: submission.resultToken,
      dueText,
      waitlist: SITE.global.waitlist,
      scores: SITE.global.showScore
        ? { headline: scores.headline, band: scores.band, bandDisplayName: scores.bandDisplayName, bandColour: scores.bandColour }
        : null,
    },
    { status: 201 },
  );
}
