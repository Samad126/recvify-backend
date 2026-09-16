import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class ContactInfoDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  fullName: string;

  @ApiPropertyOptional({ maxLength: 150, example: 'Senior Frontend Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 150, example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;
}
