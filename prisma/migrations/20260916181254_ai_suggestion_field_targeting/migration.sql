-- AlterTable
ALTER TABLE "ai_suggestions" ADD COLUMN     "entryId" TEXT,
ADD COLUMN     "fieldKey" TEXT,
ADD COLUMN     "label" TEXT;

-- CreateIndex
CREATE INDEX "ai_suggestions_entryId_idx" ON "ai_suggestions"("entryId");

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "cv_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
