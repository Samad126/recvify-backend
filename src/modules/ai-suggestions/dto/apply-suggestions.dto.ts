import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ApplySuggestionsDto {
  @ApiProperty({
    type: [String],
    description: 'Ids of ACCEPTED or EDITED suggestions to write into their CV entries.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}
