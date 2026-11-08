
-- AlterEnum
ALTER TYPE "FirmSizeBand" ADD VALUE 'SOLE';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "stateRegion" TEXT,
ALTER COLUMN "city" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "intakeCaseSystem" TEXT,
ADD COLUMN     "intakeOutOfHours" TEXT,
ADD COLUMN     "intakeRating" TEXT,
ADD COLUMN     "intakeReplySpeed" TEXT,
ADD COLUMN     "intakeVolume" TEXT,
ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextStepClickedAt" TIMESTAMP(3),
ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "retakeReminderAt" TIMESTAMP(3),
ADD COLUMN     "route" TEXT;

-- AlterTable
ALTER TABLE "GeneratedReport" ADD COLUMN     "intakeNoteJson" JSONB,
ADD COLUMN     "plan90DayJson" JSONB,
ADD COLUMN     "quickWinsJson" JSONB;

-- AlterTable
ALTER TABLE "GlobalSubmission" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "intakeCaseSystem" TEXT,
ADD COLUMN     "intakeOutOfHours" TEXT,
ADD COLUMN     "intakeRating" TEXT,
ADD COLUMN     "intakeReplySpeed" TEXT,
ADD COLUMN     "intakeVolume" TEXT,
ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "nextStepClickedAt" TIMESTAMP(3),
ADD COLUMN     "privacyVersion" TEXT,
ADD COLUMN     "reportDraftAt" TIMESTAMP(3),
ADD COLUMN     "reportDraftJson" JSONB,
ADD COLUMN     "reportFinalJson" JSONB,
ADD COLUMN     "resultToken" TEXT,
ADD COLUMN     "route" TEXT,
ADD COLUMN     "scoreBand" "ScoreBandLabel",
ADD COLUMN     "scoreHeadline" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSubmission_resultToken_key" ON "GlobalSubmission"("resultToken");

