import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { GeminiService } from '../../common/gemini/gemini.service.js';
import { CvsService } from '../cvs/cvs.service.js';
import type { Prisma, SectionType } from '../../generated/prisma/client.js';
import { GenerateSuggestionsDto } from './dto/generate-suggestions.dto.js';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto.js';
import { ApplySuggestionsDto } from './dto/apply-suggestions.dto.js';

/** Only these section types carry free text worth rewriting. */
const IMPROVABLE_SECTION_TYPES: SectionType[] = ['SUMMARY', 'EXPERIENCE', 'CUSTOM'];

function fieldKeyFor(sectionType: SectionType): string {
  return sectionType === 'EXPERIENCE' ? 'description' : 'text';
}

@Injectable()
export class AiSuggestionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gemini: GeminiService,
    private readonly cvsService: CvsService,
  ) {}

  private async getOwnedSuggestionOrThrow(cvId: string, suggestionId: string, userId: string) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);
    const suggestion = await this.db.aiSuggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion || suggestion.cvId !== cvId) {
      throw new NotFoundException('Suggestion not found');
    }
    return suggestion;
  }

  async generate(cvId: string, userId: string, dto: GenerateSuggestionsDto) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);

    const sectionTypes =
      dto.scope === 'WHOLE_CV' ? IMPROVABLE_SECTION_TYPES : [dto.scope];

    const sections = await this.db.cvSection.findMany({
      where: { cvId, sectionType: { in: sectionTypes } },
      include: { entries: true },
    });

    const targets: { entryId: string; sectionId: string; fieldKey: string; text: string }[] = [];
    for (const section of sections) {
      const fieldKey = fieldKeyFor(section.sectionType);
      for (const entry of section.entries) {
        const fields = entry.fieldsJson as Record<string, unknown>;
        const text = fields[fieldKey];
        if (typeof text === 'string' && text.trim().length > 0) {
          targets.push({ entryId: entry.id, sectionId: section.id, fieldKey, text });
        }
      }
    }

    if (targets.length === 0) return [];

    const results = await this.gemini.generateSuggestions(
      targets.map((t, index) => ({ index, text: t.text })),
    );

    return this.db.$transaction(
      results.map((result) => {
        const target = targets[result.index];
        return this.db.aiSuggestion.create({
          data: {
            cvId,
            sectionId: target.sectionId,
            entryId: target.entryId,
            fieldKey: target.fieldKey,
            label: result.label,
            originalText: target.text,
            suggestedText: result.suggestedText,
            source: 'IMPROVE',
          },
        });
      }),
    );
  }

  async list(cvId: string, userId: string) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);
    return this.db.aiSuggestion.findMany({
      where: { cvId, source: 'IMPROVE' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateStatus(
    cvId: string,
    suggestionId: string,
    userId: string,
    dto: UpdateSuggestionDto,
  ) {
    await this.getOwnedSuggestionOrThrow(cvId, suggestionId, userId);

    if (dto.status === 'EDITED' && !dto.suggestedText) {
      throw new BadRequestException('suggestedText is required when status is EDITED');
    }

    return this.db.aiSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: dto.status,
        ...(dto.suggestedText !== undefined && { suggestedText: dto.suggestedText }),
      },
    });
  }

  /** Writes ACCEPTED/EDITED suggestions' text into their target CvEntry.fieldsJson, in one transaction. */
  async apply(cvId: string, userId: string, dto: ApplySuggestionsDto) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);

    const suggestions = await this.db.aiSuggestion.findMany({
      where: { id: { in: dto.ids }, cvId },
    });
    if (suggestions.length !== dto.ids.length) {
      throw new NotFoundException('One or more suggestions were not found on this CV');
    }
    const notApplicable = suggestions.filter(
      (s) => s.status !== 'ACCEPTED' && s.status !== 'EDITED',
    );
    if (notApplicable.length > 0) {
      throw new BadRequestException(
        'Only ACCEPTED or EDITED suggestions can be applied',
      );
    }

    await this.db.$transaction(async (tx) => {
      for (const suggestion of suggestions) {
        if (!suggestion.entryId || !suggestion.fieldKey) continue;
        const entry = await tx.cvEntry.findUnique({ where: { id: suggestion.entryId } });
        if (!entry) continue;

        const updatedFields = {
          ...(entry.fieldsJson as Record<string, unknown>),
          [suggestion.fieldKey]: suggestion.suggestedText,
        };
        await tx.cvEntry.update({
          where: { id: entry.id },
          data: { fieldsJson: updatedFields as Prisma.InputJsonValue },
        });
      }
      await tx.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } });
    });
  }
}
