-- AlterTable
ALTER TABLE "ai_suggestions" ADD COLUMN     "jobDescriptionId" TEXT;

-- CreateIndex
CREATE INDEX "ai_suggestions_jobDescriptionId_idx" ON "ai_suggestions"("jobDescriptionId");

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
