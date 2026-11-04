-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "resultToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Submission_resultToken_key" ON "Submission"("resultToken");

