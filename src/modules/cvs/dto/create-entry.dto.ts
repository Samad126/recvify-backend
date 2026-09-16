import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { SECTION_FIELDS_SCHEMA_REFS } from './section-fields.dto.js';

export class CreateEntryDto {
  @ApiProperty({
    oneOf: SECTION_FIELDS_SCHEMA_REFS,
    description:
      "Fields matching the parent section's type — the server picks and validates against the matching schema (Summary/Experience/Education/Skills/Certification/Custom) based on the target section's sectionType.",
  })
  @IsObject()
  fieldsJson: Record<string, unknown>;
}
