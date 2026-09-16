import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuggestionSource, SuggestionStatus } from '../../../generated/prisma/client.js';

export class AiSuggestionEntity {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  sectionId: string | null;

  @ApiPropertyOptional()
  entryId: string | null;

  @ApiPropertyOptional({ example: 'description' })
  fieldKey: string | null;

  @ApiPropertyOptional({ description: 'Set when this suggestion came from a JD-tailoring analysis' })
  jobDescriptionId: string | null;

  @ApiPropertyOptional({ example: 'Stronger action verbs' })
  label: string | null;

  @ApiProperty()
  originalText: string;

  @ApiProperty()
  suggestedText: string;

  @ApiProperty({ enum: SuggestionStatus })
  status: SuggestionStatus;

  @ApiProperty({ enum: SuggestionSource })
  source: SuggestionSource;

  @ApiProperty()
  createdAt: Date;
}
