-- AlterTable
ALTER TABLE "cvs" ADD COLUMN     "contactInfoJson" JSONB,
ADD COLUMN     "sourceUploadId" TEXT;

-- CreateIndex
CREATE INDEX "cvs_sourceUploadId_idx" ON "cvs"("sourceUploadId");

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_sourceUploadId_fkey" FOREIGN KEY ("sourceUploadId") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
