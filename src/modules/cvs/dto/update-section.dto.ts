import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { StyleOverridesDto } from './style-overrides.dto.js';

export class UpdateSectionDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    type: StyleOverridesDto,
    description:
      'Style override for this section only — cascades over the CV-level default for every entry inside it, unless an entry has its own override.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StyleOverridesDto)
  styleOverridesJson?: StyleOverridesDto;
}
