import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class StyleOverridesDto {
  @ApiPropertyOptional({ example: 'Inter' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fontFamily?: string;

  @ApiPropertyOptional({ example: 14, minimum: 8, maximum: 32 })
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(32)
  fontSize?: number;

  @ApiPropertyOptional({ example: '#0F766E', description: 'Hex color' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'accentColor must be a hex color, e.g. #0F766E' })
  accentColor?: string;

  @ApiPropertyOptional({ enum: ['light', 'dark'] })
  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';
}
