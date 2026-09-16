/*
  Warnings:

  - You are about to drop the column `category` on the `templates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cv_sections" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "cvs" ADD COLUMN     "styleOverridesJson" JSONB;

-- AlterTable
ALTER TABLE "templates" DROP COLUMN "category",
ADD COLUMN     "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT;
