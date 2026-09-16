import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SuggestionStatus } from '../../../generated/prisma/client.js';

export class UpdateSuggestionDto {
  @ApiProperty({
    enum: SuggestionStatus,
    description:
      'ACCEPTED/REJECTED from the Accept/Reject buttons, EDITED (with a modified suggestedText) from the Edit action, or PENDING to Undo a previous decision.',
  })
  @IsEnum(SuggestionStatus)
  status: SuggestionStatus;

  @ApiPropertyOptional({
    maxLength: 4000,
    description: 'Required when status is EDITED — the user-modified suggestion text.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  suggestedText?: string;
}
