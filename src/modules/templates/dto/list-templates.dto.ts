import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListTemplatesDto {
  @ApiPropertyOptional({
    description: 'Free-text search against the template name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by industry tag (e.g. "technology", "finance")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Filter by style tag (e.g. "modern", "classic", "minimal")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  style?: string;

  @ApiPropertyOptional({
    description: 'Only return ATS-optimized templates',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  atsOnly?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Sort order for results',
    enum: ['recent', 'name'],
    default: 'recent',
  })
  @IsOptional()
  @IsIn(['recent', 'name'])
  sort: 'recent' | 'name' = 'recent';
}
