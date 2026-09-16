import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ExportFormat } from '../../../generated/prisma/client.js';

export class CreateExportDto {
  @ApiProperty({
    enum: ExportFormat,
    description:
      'PDF/DOCX render the current CV content to a file and return a downloadUrl. LINK creates (or reuses) a durable public share slug that always reflects the CV\'s current live content.',
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;
}
