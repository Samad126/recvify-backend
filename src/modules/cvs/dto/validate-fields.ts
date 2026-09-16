import { BadRequestException } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SectionType } from '../../../generated/prisma/client.js';
import { SECTION_FIELDS_DTO } from './section-fields.dto.js';

/**
 * Validates and normalizes a CvEntry's `fieldsJson` against the DTO for its
 * parent section's `sectionType`, so every EXPERIENCE/EDUCATION/... entry has
 * a predictable, documented shape instead of an unchecked JSON blob.
 */
export async function validateEntryFields(
  sectionType: SectionType,
  fields: unknown,
): Promise<Record<string, unknown>> {
  const dtoClass = SECTION_FIELDS_DTO[sectionType] as new () => object;
  const instance = plainToInstance(dtoClass, fields ?? {});

  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    throw new BadRequestException(messages);
  }

  return instanceToPlain(instance);
}

/**
 * Same as `validateEntryFields`, but allows a partial payload (for PATCH) by
 * only validating — and returning — the keys actually present in `fields`.
 *
 * Note: `plainToInstance` materializes every declared class field as its own
 * property (set to `undefined` if not provided, since the tsconfig target
 * uses `useDefineForClassFields` semantics). `instanceToPlain` would therefore
 * include those as explicit `undefined` entries, which — if merged into an
 * existing entry's fieldsJson — silently wipe out previously-stored values
 * for every field the caller didn't intend to touch. Only project out the
 * keys the caller actually sent.
 */
export async function validatePartialEntryFields(
  sectionType: SectionType,
  fields: unknown,
): Promise<Record<string, unknown>> {
  const dtoClass = SECTION_FIELDS_DTO[sectionType] as new () => object;
  const plainFields = (fields ?? {}) as Record<string, unknown>;
  const instance = plainToInstance(dtoClass, plainFields);

  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    throw new BadRequestException(messages);
  }

  const validated = instanceToPlain(instance) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(plainFields)) {
    patch[key] = validated[key];
  }
  return patch;
}
