import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SectionType } from '../../../generated/prisma/client.js';

export class CreateSectionDto {
  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  sectionType: SectionType;

  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Overrides the default header; required in practice for CUSTOM sections',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}
