-- AlterTable
ALTER TABLE "cv_entries" ADD COLUMN     "styleOverridesJson" JSONB;

-- AlterTable
ALTER TABLE "cv_sections" ADD COLUMN     "styleOverridesJson" JSONB;
