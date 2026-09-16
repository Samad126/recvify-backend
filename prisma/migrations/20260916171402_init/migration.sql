-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "CvStatus" AS ENUM ('DRAFT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS', 'CERTIFICATIONS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EDITED');

-- CreateEnum
CREATE TYPE "SuggestionSource" AS ENUM ('IMPROVE', 'JD_TAILOR');

-- CreateEnum
CREATE TYPE "JdSourceType" AS ENUM ('PASTE', 'FILE', 'URL');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'DOCX', 'LINK');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PARSED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "hashedRefreshToken" TEXT,
    "googleId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "category" TEXT[],
    "structureJson" JSONB NOT NULL,
    "isAtsFriendly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cvs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CvStatus" NOT NULL DEFAULT 'DRAFT',
    "isVariant" BOOLEAN NOT NULL DEFAULT false,
    "parentCvId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_sections" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "sectionType" "SectionType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "cv_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_entries" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "fieldsJson" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cv_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "sectionId" TEXT,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "source" "SuggestionSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "sourceType" "JdSourceType" NOT NULL,
    "matchScore" INTEGER,
    "extractedKeywords" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exports" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "fileUrl" TEXT,
    "shareSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "parsedStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING',
    "parsedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "cvs_userId_idx" ON "cvs"("userId");

-- CreateIndex
CREATE INDEX "cvs_parentCvId_idx" ON "cvs"("parentCvId");

-- CreateIndex
CREATE INDEX "cv_sections_cvId_idx" ON "cv_sections"("cvId");

-- CreateIndex
CREATE INDEX "cv_entries_sectionId_idx" ON "cv_entries"("sectionId");

-- CreateIndex
CREATE INDEX "ai_suggestions_cvId_idx" ON "ai_suggestions"("cvId");

-- CreateIndex
CREATE INDEX "job_descriptions_cvId_idx" ON "job_descriptions"("cvId");

-- CreateIndex
CREATE UNIQUE INDEX "exports_shareSlug_key" ON "exports"("shareSlug");

-- CreateIndex
CREATE INDEX "exports_cvId_idx" ON "exports"("cvId");

-- CreateIndex
CREATE INDEX "uploads_userId_idx" ON "uploads"("userId");

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_parentCvId_fkey" FOREIGN KEY ("parentCvId") REFERENCES "cvs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_sections" ADD CONSTRAINT "cv_sections_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "cv_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "cv_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
