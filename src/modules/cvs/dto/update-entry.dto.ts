import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import { SECTION_FIELDS_SCHEMA_REFS } from './section-fields.dto.js';
import type { StyleOverridesDto } from './style-overrides.dto.js';

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
    type: Object,
    description:
      "Per-field style overrides for this entry, keyed by field name (e.g. \"jobTitle\", \"company\", \"description\") — cascades over the section/CV-level default so each piece of text in the entry can be colored/sized independently. Not deeply validated — cosmetic data.",
    example: { jobTitle: { accentColor: '#1D4ED8' }, company: { fontFamily: 'Georgia' } },
  })
  @IsOptional()
  @IsObject()
  styleOverridesJson?: Record<string, StyleOverridesDto>;
}
