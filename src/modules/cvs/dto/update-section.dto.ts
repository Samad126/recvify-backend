import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateSectionDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  title: string;
}
