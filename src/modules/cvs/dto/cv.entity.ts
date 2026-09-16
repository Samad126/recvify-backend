import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CvStatus, SectionType } from '../../../generated/prisma/client.js';
import { TemplateDetailEntity } from '../../templates/dto/template.entity.js';

export class CvEntryEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: Object })
  fieldsJson: Record<string, unknown>;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional({
    type: Object,
    description: 'Per-entry font/color override, cascades over the section/CV-level default',
  })
  styleOverridesJson: Record<string, unknown> | null;
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

  @ApiPropertyOptional({
    type: Object,
    description: 'Per-section font/color override, cascades over the CV-level default',
  })
  styleOverridesJson: Record<string, unknown> | null;

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

  @ApiPropertyOptional({ type: Object, description: 'fullName/title/email/phone/location' })
  contactInfoJson: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'The Upload this CV was built from, if any' })
  sourceUploadId: string | null;

  @ApiPropertyOptional({ description: 'Servable URL for the optional profile photo, e.g. /photos/<file>' })
  photoUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    type: TemplateDetailEntity,
    description: "The full template (including structureJson) this CV's layout is based on",
  })
  template: TemplateDetailEntity;

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
