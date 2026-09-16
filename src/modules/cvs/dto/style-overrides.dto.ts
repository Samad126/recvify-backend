import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class StyleOverridesDto {
  @ApiPropertyOptional({ example: 'Inter' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fontFamily?: string;

  @ApiPropertyOptional({ example: 14, minimum: 6, maximum: 96, description: 'Points/px — half-point values like 10.5 are allowed' })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(96)
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bold?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  italic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  underline?: boolean;

  @ApiPropertyOptional({ example: 1.4, minimum: 1, maximum: 3, description: 'Line-height multiplier, not px' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  lineHeight?: number;

  @ApiPropertyOptional({
    type: Object,
    description:
      "CV-level only: per-field style for the header's individual text nodes (fullName/title/email/phone/location), keyed by field name. Not deeply validated — cosmetic data.",
    example: { title: { accentColor: '#1D4ED8' } },
  })
  @IsOptional()
  @IsObject()
  fieldOverrides?: Record<string, StyleOverridesDto>;
}
