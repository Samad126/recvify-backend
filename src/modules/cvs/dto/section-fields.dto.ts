import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * One DTO per `SectionType`, used to validate `CvEntry.fieldsJson` against the
 * shape appropriate for its parent section — see SECTION_FIELDS_DTO below.
 */

export class SummaryFieldsDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}

export class ExperienceFieldsDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  jobTitle: string;

  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  company: string;

  @ApiProperty({ example: 'Mar 2020', description: 'Free-text start date' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  startDate: string;

  @ApiPropertyOptional({ example: 'Present', description: 'Free-text end date; omit if current' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiProperty({ maxLength: 4000, description: 'Bullet points / description' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;
}

export class EducationFieldsDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  school: string;

  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  degree: string;

  @ApiProperty({ example: '2016-09', description: 'Free-text start date' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  startDate: string;

  @ApiPropertyOptional({ example: '2020-06', description: 'Free-text end date' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  endDate?: string;
}

export class SkillsFieldsDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] })
  @IsOptional()
  @IsIn(['Beginner', 'Intermediate', 'Advanced', 'Expert'])
  level?: string;
}

export class CertificationFieldsDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  issuer?: string;

  @ApiPropertyOptional({ example: '2023-05', description: 'Free-text date' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  date?: string;
}

export class CustomFieldsDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}

export const SECTION_FIELDS_DTO = {
  SUMMARY: SummaryFieldsDto,
  EXPERIENCE: ExperienceFieldsDto,
  EDUCATION: EducationFieldsDto,
  SKILLS: SkillsFieldsDto,
  CERTIFICATIONS: CertificationFieldsDto,
  CUSTOM: CustomFieldsDto,
} as const;

/** Referenced from Swagger docs to point readers at the per-type shapes above. */
export const SECTION_FIELDS_SCHEMA_REFS = Object.values(SECTION_FIELDS_DTO).map((dto) => ({
  $ref: getSchemaPath(dto),
}));
