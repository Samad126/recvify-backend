import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CvSectionEntity } from '../../cvs/dto/cv.entity.js';
import { TemplateDetailEntity } from '../../templates/dto/template.entity.js';

export class PublicCvEntity {
  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: Object, description: 'fullName/title/email/phone/location' })
  contactInfoJson: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object })
  styleOverridesJson: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Servable URL for the optional profile photo' })
  photoUrl: string | null;

  @ApiProperty({ type: TemplateDetailEntity })
  template: TemplateDetailEntity;

  @ApiProperty({ type: [CvSectionEntity] })
  sections: CvSectionEntity[];
}
