import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCvDto {
  @ApiProperty({ description: 'Id of the Template to base this CV on' })
  @IsUUID()
  templateId: string;

  @ApiPropertyOptional({ maxLength: 150, example: 'Software Engineer - Master' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;
}
