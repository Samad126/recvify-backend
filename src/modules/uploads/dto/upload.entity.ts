import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParseStatus } from '../../../generated/prisma/client.js';
import type { ParsedResumeData } from '../../../common/gemini/resume-schema.js';

export class UploadEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ParseStatus })
  parsedStatus: ParseStatus;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Structured resume data extracted by Gemini once parsedStatus is PARSED; null while PENDING or if parsing FAILED.',
  })
  parsedData: ParsedResumeData | null;

  @ApiProperty()
  createdAt: Date;
}
