import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { TemplatesService } from './templates.service.js';
import { ListTemplatesDto } from './dto/list-templates.dto.js';
import {
  PaginatedTemplatesEntity,
  TemplateDetailEntity,
} from './dto/template.entity.js';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List CV templates',
    description:
      'Browse templates with optional free-text search and industry/style/ATS filters, paginated.',
  })
  @ApiOkResponse({ type: PaginatedTemplatesEntity })
  list(@Query() query: ListTemplatesDto) {
    return this.templatesService.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single template, including its layout structure' })
  @ApiOkResponse({ type: TemplateDetailEntity })
  @ApiNotFoundResponse({ description: 'Template not found' })
  findById(@Param('id') id: string) {
    return this.templatesService.findById(id);
  }
}
