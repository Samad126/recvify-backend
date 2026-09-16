import { randomBytes, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../common/database/database.service.js';
import { PdfService } from '../../common/pdf/pdf.service.js';
import { renderCvHtml } from '../../common/export/cv-html-renderer.js';
import { buildCvDocx } from '../../common/export/cv-docx-renderer.js';
import type { ExportableCv } from '../../common/export/export-cv.types.js';
import type { Export } from '../../generated/prisma/client.js';
import { CvsService } from '../cvs/cvs.service.js';
import { CreateExportDto } from './dto/create-export.dto.js';
import { ExportEntity } from './dto/export.entity.js';
import { PublicCvEntity } from './dto/public-cv.entity.js';

const CV_WITH_CONTENT_INCLUDE = {
  template: true,
  sections: {
    orderBy: { sortOrder: 'asc' as const },
    include: { entries: { orderBy: { sortOrder: 'asc' as const } } },
  },
};

@Injectable()
export class ExportsService {
  private readonly exportDir: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly cvsService: CvsService,
    private readonly pdfService: PdfService,
    private readonly configService: ConfigService,
  ) {
    this.exportDir = this.configService.get<string>('EXPORT_DIR') ?? './exports';
  }

  private toEntity(cvId: string, row: Export): ExportEntity {
    return {
      id: row.id,
      format: row.format,
      shareSlug: row.shareSlug,
      downloadUrl: row.fileUrl ? `/cvs/${cvId}/exports/${row.id}/download` : null,
      createdAt: row.createdAt,
    };
  }

  async create(cvId: string, userId: string, dto: CreateExportDto): Promise<ExportEntity> {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);

    if (dto.format === 'LINK') {
      const existing = await this.db.export.findFirst({ where: { cvId, format: 'LINK' } });
      if (existing) return this.toEntity(cvId, existing);

      const created = await this.db.export.create({
        data: { cvId, format: 'LINK', shareSlug: randomBytes(9).toString('base64url') },
      });
      return this.toEntity(cvId, created);
    }

    const cv = (await this.db.cv.findUniqueOrThrow({
      where: { id: cvId },
      include: CV_WITH_CONTENT_INCLUDE,
    })) as ExportableCv;

    const buffer =
      dto.format === 'PDF' ? await this.pdfService.renderPdf(renderCvHtml(cv)) : await buildCvDocx(cv);
    const extension = dto.format === 'PDF' ? 'pdf' : 'docx';

    const dir = join(this.exportDir, cvId);
    await mkdir(dir, { recursive: true });
    const fileName = `${randomUUID()}.${extension}`;
    const filePath = join(dir, fileName);
    await writeFile(filePath, buffer);

    const created = await this.db.export.create({
      data: { cvId, format: dto.format, fileUrl: filePath },
    });
    return this.toEntity(cvId, created);
  }

  async list(cvId: string, userId: string): Promise<ExportEntity[]> {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);
    const rows = await this.db.export.findMany({ where: { cvId }, orderBy: { createdAt: 'desc' } });
    return rows.map((row) => this.toEntity(cvId, row));
  }

  async getFileForDownload(cvId: string, exportId: string, userId: string): Promise<Export> {
    await this.cvsService.getOwnedCvOrThrow(cvId, userId);
    const row = await this.db.export.findUnique({ where: { id: exportId } });
    if (!row || row.cvId !== cvId || !row.fileUrl) {
      throw new NotFoundException('Export not found');
    }
    return row;
  }

  /**
   * Public, unauthenticated — must only ever return fields safe to expose to
   * anyone with the link. No userId/cvId/parentCvId/sourceUploadId/status/etc.
   */
  async getPublicCv(shareSlug: string): Promise<PublicCvEntity> {
    const exportRow = await this.db.export.findUnique({ where: { shareSlug } });
    if (!exportRow || exportRow.format !== 'LINK') {
      throw new NotFoundException('Shared resume not found');
    }
    const cv = (await this.db.cv.findUnique({
      where: { id: exportRow.cvId },
      include: CV_WITH_CONTENT_INCLUDE,
    })) as ExportableCv | null;
    if (!cv) throw new NotFoundException('Shared resume not found');

    return {
      title: cv.title,
      contactInfoJson: cv.contactInfoJson as Record<string, unknown> | null,
      styleOverridesJson: cv.styleOverridesJson as Record<string, unknown> | null,
      template: {
        id: cv.template.id,
        name: cv.template.name,
        tagline: cv.template.tagline,
        thumbnailUrl: cv.template.thumbnailUrl,
        industries: cv.template.industries,
        styles: cv.template.styles,
        isAtsFriendly: cv.template.isAtsFriendly,
        createdAt: cv.template.createdAt,
        structureJson: cv.template.structureJson as object,
      },
      sections: cv.sections.map((section) => ({
        id: section.id,
        sectionType: section.sectionType,
        title: section.title,
        sortOrder: section.sortOrder,
        styleOverridesJson: section.styleOverridesJson as Record<string, unknown> | null,
        entries: section.entries.map((entry) => ({
          id: entry.id,
          fieldsJson: entry.fieldsJson as Record<string, unknown>,
          sortOrder: entry.sortOrder,
          styleOverridesJson: entry.styleOverridesJson as Record<string, unknown> | null,
        })),
      })),
    };
  }
}
