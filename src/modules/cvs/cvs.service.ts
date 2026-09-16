import { Injectable, NotFoundException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { DatabaseService } from '../../common/database/database.service.js';
import { CreateCvDto } from './dto/create-cv.dto.js';
import { UpdateCvDto } from './dto/update-cv.dto.js';
import { ListCvsDto } from './dto/list-cvs.dto.js';

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
      },
      select: CV_LIST_SELECT,
    });
  }

  async remove(cvId: string, userId: string) {
    await this.getOwnedCvOrThrow(cvId, userId);
    await this.db.cv.delete({ where: { id: cvId } });
  }
}
