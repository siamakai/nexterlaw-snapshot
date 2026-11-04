-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Vertical" AS ENUM ('LAW', 'ACCOUNTANCY');

-- CreateEnum
CREATE TYPE "FirmSizeBand" AS ENUM ('MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EUFacingAnswer" AS ENUM ('YES', 'NO', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "SelfAssessmentAnswer" AS ENUM ('YES', 'NO', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SCORING', 'RETRIEVING', 'GENERATING', 'RENDERING_PDF', 'SENDING_EMAIL', 'COMPLETE', 'FAILED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "KnowledgeBaseCategory" AS ENUM ('REGULATORY_GUIDANCE', 'USE_CASE_LIBRARY', 'RISK_LIBRARY', 'CONDITIONAL_EU_LAYER', 'TOOL_CATEGORIES');

-- CreateEnum
CREATE TYPE "EmailSequenceDay" AS ENUM ('DAY_0', 'DAY_3', 'DAY_7');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "ScoreBandLabel" AS ENUM ('EXPOSED', 'DEVELOPING', 'IN_CONTROL');

-- CreateEnum
CREATE TYPE "ManualReportStatus" AS ENUM ('PENDING', 'RESEARCHING', 'REPORT_READY', 'SENT');

-- CreateEnum
CREATE TYPE "CurrentAiUsageAnswer" AS ENUM ('YES', 'NOT_SURE', 'NO');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "firmWebsite" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'United Kingdom',
    "workEmail" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "privacyVersion" TEXT NOT NULL DEFAULT '1.0',
    "crmTagged" BOOLEAN NOT NULL DEFAULT false,
    "crmTaggedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "practiceTypes" TEXT[],
    "firmSize" "FirmSizeBand" NOT NULL,
    "euFacing" "EUFacingAnswer" NOT NULL,
    "vertical" "Vertical" NOT NULL DEFAULT 'LAW',
    "answerCompliance" "SelfAssessmentAnswer" NOT NULL,
    "answerLiteracy" "SelfAssessmentAnswer" NOT NULL,
    "answerExplainability" "SelfAssessmentAnswer" NOT NULL,
    "answerAccountability" "SelfAssessmentAnswer" NOT NULL,
    "answerRights" "SelfAssessmentAnswer" NOT NULL,
    "answerTransparency" "SelfAssessmentAnswer" NOT NULL,
    "answerReliability" "SelfAssessmentAnswer" NOT NULL,
    "answerUsageGovernance" "SelfAssessmentAnswer" NOT NULL,
    "answerSecurity" "SelfAssessmentAnswer" NOT NULL,
    "answerTraceability" "SelfAssessmentAnswer" NOT NULL,
    "scoreCompliance" DOUBLE PRECISION,
    "scoreLiteracy" DOUBLE PRECISION,
    "scoreExplainability" DOUBLE PRECISION,
    "scoreAccountability" DOUBLE PRECISION,
    "scoreRights" DOUBLE PRECISION,
    "scoreTransparency" DOUBLE PRECISION,
    "scoreReliability" DOUBLE PRECISION,
    "scoreUsageGovernance" DOUBLE PRECISION,
    "scoreSecurity" DOUBLE PRECISION,
    "scoreTraceability" DOUBLE PRECISION,
    "scoreHeadline" DOUBLE PRECISION,
    "scoreBand" "ScoreBandLabel",
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseEntry" (
    "id" TEXT NOT NULL,
    "category" "KnowledgeBaseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "appliedToPracticeTypes" TEXT[],
    "appliedToFirmSizes" "FirmSizeBand"[],
    "sourceReference" TEXT,
    "lastReviewedDate" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "vertical" "Vertical" NOT NULL DEFAULT 'LAW',
    "isEuLayerEntry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "KnowledgeBaseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "vertical" "Vertical" NOT NULL DEFAULT 'LAW',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearTrustDimension" (
    "id" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "vertical" "Vertical" NOT NULL DEFAULT 'LAW',
    "regulatorLabel" TEXT NOT NULL DEFAULT 'SRA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClearTrustDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringRule" (
    "id" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "firmSizeBand" "FirmSizeBand",
    "practiceTypeSlug" TEXT,
    "yesScore" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "notSureScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "noScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "weightMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreBand" (
    "id" TEXT NOT NULL,
    "label" "ScoreBandLabel" NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "colour" TEXT NOT NULL DEFAULT '#000000',
    "vertical" "Vertical" NOT NULL DEFAULT 'LAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "coverJson" JSONB,
    "scoreNarrativeJson" JSONB,
    "regulatoryMapJson" JSONB,
    "shadowAiJson" JSONB,
    "opportunitiesJson" JSONB,
    "exposuresJson" JSONB,
    "upsellJson" JSONB,
    "rawClaudeResponse" TEXT,
    "validationPassed" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" TEXT[],
    "generationTimeMs" INTEGER,
    "modelUsed" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "vertical" "Vertical" NOT NULL DEFAULT 'LAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequenceDay" "EmailSequenceDay" NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "vertical" "Vertical" NOT NULL DEFAULT 'LAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "submissionId" TEXT,
    "sequenceDay" "EmailSequenceDay" NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSubmission" (
    "id" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "firmWebsite" TEXT,
    "workEmail" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "stateProvince" TEXT,
    "secondaryStates" TEXT[],
    "regulatoryBody" TEXT,
    "secondaryJurisdiction" TEXT,
    "firmSize" TEXT NOT NULL,
    "primaryPracticeArea" TEXT NOT NULL,
    "primaryPracticeAreaOther" TEXT,
    "secondaryPracticeAreas" TEXT[],
    "currentlyUsingAi" "CurrentAiUsageAnswer" NOT NULL,
    "aiToolsInUse" TEXT,
    "hasAiPolicy" "SelfAssessmentAnswer" NOT NULL,
    "clientsAskedAboutAi" "SelfAssessmentAnswer" NOT NULL,
    "answerCompliance" "SelfAssessmentAnswer" NOT NULL,
    "answerLiteracy" "SelfAssessmentAnswer" NOT NULL,
    "answerExplainability" "SelfAssessmentAnswer" NOT NULL,
    "answerAccountability" "SelfAssessmentAnswer" NOT NULL,
    "answerRights" "SelfAssessmentAnswer" NOT NULL,
    "answerTransparency" "SelfAssessmentAnswer" NOT NULL,
    "answerReliability" "SelfAssessmentAnswer" NOT NULL,
    "answerUsageGovernance" "SelfAssessmentAnswer" NOT NULL,
    "answerSecurity" "SelfAssessmentAnswer" NOT NULL,
    "answerTraceability" "SelfAssessmentAnswer" NOT NULL,
    "biggestConcern" TEXT,
    "whatWouldHelpMost" TEXT,
    "contactPermission" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "status" "ManualReportStatus" NOT NULL DEFAULT 'PENDING',
    "reportPreparedAt" TIMESTAMP(3),
    "reportSentAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_workEmail_idx" ON "Lead"("workEmail");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Submission_leadId_idx" ON "Submission"("leadId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_firmSize_idx" ON "Submission"("firmSize");

-- CreateIndex
CREATE INDEX "Submission_scoreBand_idx" ON "Submission"("scoreBand");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");

-- CreateIndex
CREATE INDEX "Submission_firmSize_scoreBand_idx" ON "Submission"("firmSize", "scoreBand");

-- CreateIndex
CREATE INDEX "KnowledgeBaseEntry_category_idx" ON "KnowledgeBaseEntry"("category");

-- CreateIndex
CREATE INDEX "KnowledgeBaseEntry_vertical_idx" ON "KnowledgeBaseEntry"("vertical");

-- CreateIndex
CREATE INDEX "KnowledgeBaseEntry_isActive_idx" ON "KnowledgeBaseEntry"("isActive");

-- CreateIndex
CREATE INDEX "KnowledgeBaseEntry_lastReviewedDate_idx" ON "KnowledgeBaseEntry"("lastReviewedDate");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeType_slug_key" ON "PracticeType"("slug");

-- CreateIndex
CREATE INDEX "PracticeType_vertical_isActive_idx" ON "PracticeType"("vertical", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClearTrustDimension_sortOrder_vertical_key" ON "ClearTrustDimension"("sortOrder", "vertical");

-- CreateIndex
CREATE INDEX "ScoringRule_dimensionId_idx" ON "ScoringRule"("dimensionId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreBand_label_key" ON "ScoreBand"("label");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedReport_submissionId_key" ON "GeneratedReport"("submissionId");

-- CreateIndex
CREATE INDEX "GeneratedReport_submissionId_idx" ON "GeneratedReport"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_slug_key" ON "PromptTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON "EmailTemplate"("slug");

-- CreateIndex
CREATE INDEX "EmailLog_leadId_idx" ON "EmailLog"("leadId");

-- CreateIndex
CREATE INDEX "EmailLog_submissionId_idx" ON "EmailLog"("submissionId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_scheduledFor_idx" ON "EmailLog"("scheduledFor");

-- CreateIndex
CREATE INDEX "GlobalSubmission_status_idx" ON "GlobalSubmission"("status");

-- CreateIndex
CREATE INDEX "GlobalSubmission_country_idx" ON "GlobalSubmission"("country");

-- CreateIndex
CREATE INDEX "GlobalSubmission_createdAt_idx" ON "GlobalSubmission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_clerkUserId_key" ON "AdminUser"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringRule" ADD CONSTRAINT "ScoringRule_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "ClearTrustDimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

