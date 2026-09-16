import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { StyleOverridesDto } from './style-overrides.dto.js';

export class UpdateCvDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ description: 'Switch this CV to a different template' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ type: StyleOverridesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StyleOverridesDto)
  styleOverridesJson?: StyleOverridesDto;
}
