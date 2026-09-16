import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ContactInfoDto } from './contact-info.dto.js';
import { EducationFieldsDto, ExperienceFieldsDto } from './section-fields.dto.js';

export class CreateCvFromUploadDto {
  @ApiProperty({ description: 'The Upload (from POST /uploads) this CV is built from' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'Id of the Template to base this CV on' })
  @IsUUID()
  templateId: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiProperty({ type: ContactInfoDto })
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo: ContactInfoDto;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({ type: [ExperienceFieldsDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ExperienceFieldsDto)
  experience?: ExperienceFieldsDto[];

  @ApiPropertyOptional({ type: [EducationFieldsDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EducationFieldsDto)
  education?: EducationFieldsDto[];

  @ApiPropertyOptional({ type: [String], example: ['TypeScript', 'React'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  skills?: string[];
}
