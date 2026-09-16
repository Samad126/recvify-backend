import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { SECTION_FIELDS_SCHEMA_REFS } from './section-fields.dto.js';
import { StyleOverridesDto } from './style-overrides.dto.js';

export class UpdateEntryDto {
  @ApiPropertyOptional({
    oneOf: SECTION_FIELDS_SCHEMA_REFS,
    description:
      'Partial fields to merge into this entry — only the keys you include are validated (against the matching per-sectionType schema) and merged into the stored entry.',
  })
  @IsOptional()
  @IsObject()
  fieldsJson?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: StyleOverridesDto,
    description:
      'Style override for this entry only — cascades over the section/CV-level default, e.g. to color or resize just one job title.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StyleOverridesDto)
  styleOverridesJson?: StyleOverridesDto;
}
