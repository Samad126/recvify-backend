import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportFormat } from '../../../generated/prisma/client.js';

export class ExportEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ExportFormat })
  format: ExportFormat;

  @ApiPropertyOptional({
    description: 'Set when format=LINK. Fetch the resume via GET /public/cvs/:shareSlug (no auth).',
  })
  shareSlug: string | null;

  @ApiPropertyOptional({
    description:
      'Set when format=PDF/DOCX. Authenticated GET route that streams the generated file.',
    example: '/cvs/abc123/exports/def456/download',
  })
  downloadUrl: string | null;

  @ApiProperty()
  createdAt: Date;
}
