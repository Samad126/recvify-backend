import { createReadStream } from 'node:fs';
import { Body, Controller, Get, Param, Post, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { ExportsService } from './exports.service.js';
import { CreateExportDto } from './dto/create-export.dto.js';
import { ExportEntity } from './dto/export.entity.js';

const CONTENT_TYPES: Record<string, string> = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const EXTENSIONS: Record<string, string> = { PDF: 'pdf', DOCX: 'docx' };

@ApiBearerAuth('accessToken')
@Controller('cvs/:cvId/exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post()
  @ApiOperation({
    summary: 'Export a CV as PDF, DOCX, or a public shareable link',
    description:
      'PDF/DOCX render the CV\'s current content (via its template layout + style overrides) to a file and return a downloadUrl to fetch it from. LINK creates (or reuses) a durable public share slug — the shared page always reflects the CV\'s current content, it is not a frozen snapshot.',
  })
  @ApiCreatedResponse({ type: ExportEntity })
  @ApiNotFoundResponse({ description: 'CV not found' })
  create(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: CreateExportDto,
  ) {
    return this.exportsService.create(cvId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List past exports for a CV' })
  @ApiOkResponse({ type: [ExportEntity] })
  @ApiNotFoundResponse({ description: 'CV not found' })
  list(@GetUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.exportsService.list(cvId, userId);
  }

  @Get(':exportId/download')
  @ApiOperation({ summary: 'Download a previously generated PDF/DOCX export' })
  @ApiOkResponse({ description: 'Binary file stream' })
  @ApiNotFoundResponse({ description: 'CV or export not found, or it has no downloadable file (e.g. a LINK export)' })
  async download(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('exportId') exportId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const record = await this.exportsService.getFileForDownload(cvId, exportId, userId);
    res.set({
      'Content-Type': CONTENT_TYPES[record.format] ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="resume.${EXTENSIONS[record.format] ?? 'bin'}"`,
    });
    return new StreamableFile(createReadStream(record.fileUrl as string));
  }
}
