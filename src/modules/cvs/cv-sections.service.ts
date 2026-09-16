import { Injectable, NotFoundException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { DatabaseService } from '../../common/database/database.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { CvsService } from './cvs.service.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { ReorderDto } from './dto/reorder.dto.js';

@Injectable()
export class CvSectionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cvsService: CvsService,
  ) {}

  async getOwnedSectionOrThrow(cvId: string, sectionId: string, userId: string) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);
    const section = await this.db.cvSection.findUnique({ where: { id: sectionId } });
    if (!section || section.cvId !== cvId) {
      throw new NotFoundException('Section not found');
    }
    return section;
  }

  async create(cvId: string, userId: string, dto: CreateSectionDto) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);

    const last = await this.db.cvSection.findFirst({
      where: { cvId },
      orderBy: { sortOrder: 'desc' },
    });

    return this.db.$transaction(async (tx) => {
      const section = await tx.cvSection.create({
        data: {
          cvId,
          sectionType: dto.sectionType,
          title: dto.title,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
      await tx.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } });
      return section;
    });
  }

  async update(cvId: string, sectionId: string, userId: string, dto: UpdateSectionDto) {
    await this.getOwnedSectionOrThrow(cvId, sectionId, userId);
    return this.db.$transaction(async (tx) => {
      const section = await tx.cvSection.update({
        where: { id: sectionId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.styleOverridesJson !== undefined && {
            styleOverridesJson: instanceToPlain(dto.styleOverridesJson) as Prisma.InputJsonValue,
          }),
        },
      });
      await tx.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } });
      return section;
    });
  }

  async reorder(cvId: string, userId: string, dto: ReorderDto) {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);

    const sections = await this.db.cvSection.findMany({ where: { cvId } });
    const validIds = new Set(sections.map((s) => s.id));
    for (const item of dto.items) {
      if (!validIds.has(item.id)) {
        throw new NotFoundException(`Section ${item.id} not found on this CV`);
      }
    }

    await this.db.$transaction([
      ...dto.items.map((item) =>
        this.db.cvSection.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
      this.db.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } }),
    ]);
  }

  async remove(cvId: string, sectionId: string, userId: string) {
    await this.getOwnedSectionOrThrow(cvId, sectionId, userId);
    await this.db.$transaction([
      this.db.cvSection.delete({ where: { id: sectionId } }),
      this.db.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } }),
    ]);
  }
}
