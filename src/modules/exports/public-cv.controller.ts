import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ExportsService } from './exports.service.js';
import { PublicCvEntity } from './dto/public-cv.entity.js';

@Public()
@Controller('public/cvs')
export class PublicCvController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get(':shareSlug')
  @ApiOperation({
    summary: "Get a CV's public read-only data via its share link",
    description:
      'No authentication required. Reflects the CV\'s current live content, not a frozen snapshot at share time. Intended for a frontend "shared resume" page to render.',
  })
  @ApiOkResponse({ type: PublicCvEntity })
  @ApiNotFoundResponse({ description: 'No active share link with this slug' })
  getPublicCv(@Param('shareSlug') shareSlug: string) {
    return this.exportsService.getPublicCv(shareSlug);
  }
}
