import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { GeminiService } from '../../common/gemini/gemini.service.js';
import { CvsService } from '../cvs/cvs.service.js';
import { collectImprovableTargets, IMPROVABLE_SECTION_TYPES } from '../../common/cv/cv-targets.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AnalyzeJobDescriptionDto } from './dto/analyze-job-description.dto.js';

@Injectable()
export class JobDescriptionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gemini: GeminiService,
    private readonly cvsService: CvsService,
  ) {}

  private async collectSkills(cvId: string): Promise<string[]> {
    const section = await this.db.cvSection.findFirst({
      where: { cvId, sectionType: 'SKILLS' },
      include: { entries: true },
    });
    if (!section) return [];
    return section.entries
      .map((entry) => (entry.fieldsJson as Record<string, unknown>).name)
      .filter((name): name is string => typeof name === 'string');
  }

  /**
   * Scores the CV against a pasted job description via Gemini, stores the
   * analysis, and creates one JD_TAILOR AiSuggestion per recommended rewrite —
   * reusing the same targets (SUMMARY/EXPERIENCE/CUSTOM text) as "Improve with
   * AI", and the existing generic accept/reject/edit/apply endpoints.
   */
  async analyze(cvId: string, userId: string, dto: AnalyzeJobDescriptionDto) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);

    const [targets, skills] = await Promise.all([
      collectImprovableTargets(this.db, cvId, IMPROVABLE_SECTION_TYPES),
      this.collectSkills(cvId),
    ]);

    const result = await this.gemini.analyzeJobMatch(
      dto.rawText,
      skills,
      targets.map((target, index) => ({ index, text: target.text })),
    );

    return this.db.$transaction(async (tx) => {
      const jobDescription = await tx.jobDescription.create({
        data: {
          cvId,
          rawText: dto.rawText,
          sourceType: 'PASTE',
          matchScore: result.matchScore,
          extractedKeywords: {
            matched: result.matchedKeywords,
            missing: result.missingKeywords,
            summary: result.summary,
          } as Prisma.InputJsonValue,
        },
      });

      const aiSuggestions = [];
      for (const suggestion of result.suggestions) {
        const target = targets[suggestion.index];
        if (!target) continue;
        aiSuggestions.push(
          await tx.aiSuggestion.create({
            data: {
              cvId,
              jobDescriptionId: jobDescription.id,
              sectionId: target.sectionId,
              entryId: target.entryId,
              fieldKey: target.fieldKey,
              label: suggestion.label,
              originalText: target.text,
              suggestedText: suggestion.suggestedText,
              source: 'JD_TAILOR',
            },
          }),
        );
      }

      return { ...jobDescription, aiSuggestions };
    });
  }

  async list(cvId: string, userId: string) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);
    return this.db.jobDescription.findMany({
      where: { cvId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(cvId: string, jdId: string, userId: string) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);
    const jobDescription = await this.db.jobDescription.findUnique({
      where: { id: jdId },
      include: { aiSuggestions: { orderBy: { createdAt: 'asc' } } },
    });
    if (!jobDescription || jobDescription.cvId !== cvId) {
      throw new NotFoundException('Job description analysis not found');
    }
    return jobDescription;
  }
}
