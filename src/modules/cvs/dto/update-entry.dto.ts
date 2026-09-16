import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { SECTION_FIELDS_SCHEMA_REFS } from './section-fields.dto.js';

export class UpdateEntryDto {
  @ApiProperty({
    oneOf: SECTION_FIELDS_SCHEMA_REFS,
    description:
      'Partial fields to merge into this entry — only the keys you include are validated (against the matching per-sectionType schema) and merged into the stored entry.',
  })
  @IsObject()
  fieldsJson: Record<string, unknown>;
}
