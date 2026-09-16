import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ListTemplatesDto } from './dto/list-templates.dto.js';

@Injectable()
export class TemplatesService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: ListTemplatesDto) {
    const where: Prisma.TemplateWhereInput = {
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
      ...(query.industry && { industries: { has: query.industry } }),
      ...(query.style && { styles: { has: query.style } }),
      ...(query.atsOnly && { isAtsFriendly: true }),
    };

    const orderBy: Prisma.TemplateOrderByWithRelationInput =
      query.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' };

    const [items, total] = await this.db.$transaction([
      this.db.template.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        omit: { structureJson: true },
      }),
      this.db.template.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async findById(id: string) {
    const template = await this.db.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }
}
