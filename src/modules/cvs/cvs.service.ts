import { Injectable, NotFoundException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { DatabaseService } from '../../common/database/database.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { CreateCvDto } from './dto/create-cv.dto.js';
import { UpdateCvDto } from './dto/update-cv.dto.js';
import { ListCvsDto } from './dto/list-cvs.dto.js';
import { CreateCvFromUploadDto } from './dto/create-cv-from-upload.dto.js';

const CV_LIST_SELECT = {
  id: true,
  title: true,
  templateId: true,
  status: true,
  isVariant: true,
  updatedAt: true,
} as const;

@Injectable()
export class CvsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Every CV/section/entry mutation must go through this — 404 (not 403) on a
   * mismatch so a non-owner can't tell whether the resource exists at all.
   */
  async getOwnedCvOrThrow(cvId: string, userId: string) {
    const cv = await this.db.cv.findUnique({ where: { id: cvId } });
    if (!cv || cv.userId !== userId) {
      throw new NotFoundException('CV not found');
    }
    return cv;
  }

  async create(userId: string, dto: CreateCvDto) {
    const template = await this.db.template.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    return this.db.cv.create({
      data: {
        userId,
        templateId: dto.templateId,
        title: dto.title ?? `Untitled — ${template.name}`,
      },
      select: CV_LIST_SELECT,
    });
  }

  async list(userId: string, query: ListCvsDto) {
    const where = { userId };
    const [items, total] = await this.db.$transaction([
      this.db.cv.findMany({
        where,
        select: CV_LIST_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.cv.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async findByIdForUser(cvId: string, userId: string) {
    await this.getOwnedCvOrThrow(cvId, userId);
    return this.db.cv.findUnique({
      where: { id: cvId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { entries: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
  }

  async update(cvId: string, userId: string, dto: UpdateCvDto) {
    await this.getOwnedCvOrThrow(cvId, userId);

    if (dto.templateId) {
      const template = await this.db.template.findUnique({
        where: { id: dto.templateId },
      });
      if (!template) throw new NotFoundException('Template not found');
    }

    return this.db.cv.update({
      where: { id: cvId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.templateId !== undefined && { templateId: dto.templateId }),
        ...(dto.styleOverridesJson !== undefined && {
          styleOverridesJson: instanceToPlain(dto.styleOverridesJson),
        }),
        ...(dto.contactInfoJson !== undefined && {
          contactInfoJson: instanceToPlain(dto.contactInfoJson),
        }),
      },
      select: CV_LIST_SELECT,
    });
  }

  async remove(cvId: string, userId: string) {
    await this.getOwnedCvOrThrow(cvId, userId);
    await this.db.cv.delete({ where: { id: cvId } });
  }

  /**
   * Atomically creates a Cv (+ SUMMARY/EXPERIENCE/EDUCATION/SKILLS sections
   * and entries) from the reviewed output of the upload/parse flow, so the
   * "Save & Continue" action on the parsed-data-review screen is one request
   * instead of the client orchestrating N section/entry calls itself.
   */
  async createFromUpload(userId: string, dto: CreateCvFromUploadDto) {
    const upload = await this.db.upload.findUnique({ where: { id: dto.uploadId } });
    if (!upload || upload.userId !== userId) {
      throw new NotFoundException('Upload not found');
    }

    const template = await this.db.template.findUnique({ where: { id: dto.templateId } });
    if (!template) throw new NotFoundException('Template not found');

    return this.db.$transaction(async (tx) => {
      const cv = await tx.cv.create({
        data: {
          userId,
          templateId: dto.templateId,
          title: dto.title ?? dto.contactInfo.fullName,
          contactInfoJson: instanceToPlain(dto.contactInfo),
          sourceUploadId: dto.uploadId,
        },
      });

      let sortOrder = 0;

      if (dto.summary) {
        const section = await tx.cvSection.create({
          data: { cvId: cv.id, sectionType: 'SUMMARY', sortOrder: sortOrder++ },
        });
        await tx.cvEntry.create({
          data: { sectionId: section.id, fieldsJson: { text: dto.summary }, sortOrder: 0 },
        });
      }

      if (dto.experience?.length) {
        const section = await tx.cvSection.create({
          data: { cvId: cv.id, sectionType: 'EXPERIENCE', sortOrder: sortOrder++ },
        });
        await tx.cvEntry.createMany({
          data: dto.experience.map((entry, i) => ({
            sectionId: section.id,
            fieldsJson: instanceToPlain(entry) as Prisma.InputJsonValue,
            sortOrder: i,
          })),
        });
      }

      if (dto.education?.length) {
        const section = await tx.cvSection.create({
          data: { cvId: cv.id, sectionType: 'EDUCATION', sortOrder: sortOrder++ },
        });
        await tx.cvEntry.createMany({
          data: dto.education.map((entry, i) => ({
            sectionId: section.id,
            fieldsJson: instanceToPlain(entry) as Prisma.InputJsonValue,
            sortOrder: i,
          })),
        });
      }

      if (dto.skills?.length) {
        const section = await tx.cvSection.create({
          data: { cvId: cv.id, sectionType: 'SKILLS', sortOrder: sortOrder++ },
        });
        await tx.cvEntry.createMany({
          data: dto.skills.map((name, i) => ({
            sectionId: section.id,
            fieldsJson: { name },
            sortOrder: i,
          })),
        });
      }

      return tx.cv.findUniqueOrThrow({
        where: { id: cv.id },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: { entries: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      });
    });
  }
}
