import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const SUGGESTION_SCOPES = ['WHOLE_CV', 'SUMMARY', 'EXPERIENCE'] as const;
export type SuggestionScope = (typeof SUGGESTION_SCOPES)[number];

export class GenerateSuggestionsDto {
  @ApiProperty({
    enum: SUGGESTION_SCOPES,
    description:
      'Which entries to generate suggestions for. Only SUMMARY and EXPERIENCE entries have free text worth rewriting; WHOLE_CV covers both.',
  })
  @IsIn(SUGGESTION_SCOPES)
  scope: SuggestionScope;
}
