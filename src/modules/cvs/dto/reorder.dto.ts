import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class ReorderItemDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  @ArrayMinSize(1)
  items: ReorderItemDto[];
}
