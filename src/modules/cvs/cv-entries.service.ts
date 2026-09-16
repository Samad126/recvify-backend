import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { CvSectionsService } from './cv-sections.service.js';
import { CreateEntryDto } from './dto/create-entry.dto.js';
import { UpdateEntryDto } from './dto/update-entry.dto.js';
import { ReorderDto } from './dto/reorder.dto.js';
import { validateEntryFields, validatePartialEntryFields } from './dto/validate-fields.js';

@Injectable()
export class CvEntriesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sectionsService: CvSectionsService,
  ) {}

  private async getOwnedEntryOrThrow(
    cvId: string,
    sectionId: string,
    entryId: string,
    userId: string,
  ) {
    await this.sectionsService.getOwnedSectionOrThrow(cvId, sectionId, userId);
    const entry = await this.db.cvEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.sectionId !== sectionId) {
      throw new NotFoundException('Entry not found');
    }
    return entry;
  }

  async create(
    cvId: string,
    sectionId: string,
    userId: string,
    dto: CreateEntryDto,
  ) {
    const section = await this.sectionsService.getOwnedSectionOrThrow(cvId, sectionId, userId);
    const fieldsJson = await validateEntryFields(section.sectionType, dto.fieldsJson);

    const last = await this.db.cvEntry.findFirst({
      where: { sectionId },
      orderBy: { sortOrder: 'desc' },
    });

    return this.db.$transaction(async (tx) => {
      const entry = await tx.cvEntry.create({
        data: {
          sectionId,
          fieldsJson: fieldsJson as Prisma.InputJsonValue,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
      await tx.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } });
      return entry;
    });
  }

  async update(
    cvId: string,
    sectionId: string,
    entryId: string,
    userId: string,
    dto: UpdateEntryDto,
  ) {
    const section = await this.sectionsService.getOwnedSectionOrThrow(cvId, sectionId, userId);
    const entry = await this.getOwnedEntryOrThrow(cvId, sectionId, entryId, userId);

    const data: Prisma.CvEntryUpdateInput = {};
    if (dto.fieldsJson !== undefined) {
      const patch = await validatePartialEntryFields(section.sectionType, dto.fieldsJson);
      data.fieldsJson = {
        ...(entry.fieldsJson as Record<string, unknown>),
        ...patch,
      } as Prisma.InputJsonValue;
    }
    if (dto.styleOverridesJson !== undefined) {
      // A field-name-keyed map (see UpdateEntryDto), not a single StyleOverridesDto —
      // stored as-is, the frontend sends the full merged map on every patch.
      data.styleOverridesJson = dto.styleOverridesJson as Prisma.InputJsonValue;
    }

    return this.db.$transaction(async (tx) => {
      const updated = await tx.cvEntry.update({ where: { id: entryId }, data });
      await tx.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } });
      return updated;
    });
  }

  async reorder(cvId: string, sectionId: string, userId: string, dto: ReorderDto) {
    await this.sectionsService.getOwnedSectionOrThrow(cvId, sectionId, userId);

    const entries = await this.db.cvEntry.findMany({ where: { sectionId } });
    const validIds = new Set(entries.map((e) => e.id));
    for (const item of dto.items) {
      if (!validIds.has(item.id)) {
        throw new NotFoundException(`Entry ${item.id} not found in this section`);
      }
    }

    await this.db.$transaction([
      ...dto.items.map((item) =>
        this.db.cvEntry.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
      this.db.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } }),
    ]);
  }

  async remove(cvId: string, sectionId: string, entryId: string, userId: string) {
    await this.getOwnedEntryOrThrow(cvId, sectionId, entryId, userId);
    await this.db.$transaction([
      this.db.cvEntry.delete({ where: { id: entryId } }),
      this.db.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } }),
    ]);
  }
}
