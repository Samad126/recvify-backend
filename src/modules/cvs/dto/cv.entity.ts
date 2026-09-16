import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CvStatus, SectionType } from '../../../generated/prisma/client.js';

export class CvEntryEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: Object })
  fieldsJson: Record<string, unknown>;

  @ApiProperty()
  sortOrder: number;
}

export class CvSectionEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SectionType })
  sectionType: SectionType;

  @ApiPropertyOptional()
  title: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ type: [CvEntryEntity] })
  entries: CvEntryEntity[];
}

export class CvListItemEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  templateId: string;

  @ApiProperty({ enum: CvStatus })
  status: CvStatus;

  @ApiProperty()
  isVariant: boolean;

  @ApiProperty()
  updatedAt: Date;
}

export class CvDetailEntity extends CvListItemEntity {
  @ApiPropertyOptional({ type: Object })
  styleOverridesJson: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [CvSectionEntity] })
  sections: CvSectionEntity[];
}

export class PaginatedCvsEntity {
  @ApiProperty({ type: [CvListItemEntity] })
  items: CvListItemEntity[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
