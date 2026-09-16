import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ example: 'Classic • Professional' })
  tagline: string | null;

  @ApiProperty()
  thumbnailUrl: string;

  @ApiProperty({ type: [String], example: ['technology', 'finance'] })
  industries: string[];

  @ApiProperty({ type: [String], example: ['modern', 'classic'] })
  styles: string[];

  @ApiProperty()
  isAtsFriendly: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class TemplateDetailEntity extends TemplateEntity {
  @ApiProperty({
    type: Object,
    description: 'Layout + section configuration used to render this template',
  })
  structureJson: object;
}

export class PaginatedTemplatesEntity {
  @ApiProperty({ type: [TemplateEntity] })
  items: TemplateEntity[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
