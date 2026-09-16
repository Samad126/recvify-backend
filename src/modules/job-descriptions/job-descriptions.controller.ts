import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { JobDescriptionsService } from './job-descriptions.service.js';
import { AnalyzeJobDescriptionDto } from './dto/analyze-job-description.dto.js';
import { JobDescriptionDetailEntity, JobDescriptionEntity } from './dto/job-description.entity.js';

@ApiBearerAuth('accessToken')
@Controller('cvs/:cvId/job-descriptions')
export class JobDescriptionsController {
  constructor(private readonly jobDescriptionsService: JobDescriptionsService) {}

  @Post('analyze')
  @ApiOperation({
    summary: 'Tailor this CV to a job description',
    description:
      'Sends the CV\'s rewritable text plus the pasted job description to Gemini, which returns a 0-100 match score, matched/missing keywords, and targeted rewrite suggestions (stored as JD_TAILOR AiSuggestions — accept/reject/edit/apply them via the existing /cvs/:cvId/ai-suggestions endpoints).',
  })
  @ApiCreatedResponse({ type: JobDescriptionDetailEntity })
  @ApiBadRequestResponse({ description: 'rawText missing or too short/long' })
  @ApiNotFoundResponse({ description: 'CV not found' })
  analyze(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: AnalyzeJobDescriptionDto,
  ) {
    return this.jobDescriptionsService.analyze(cvId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List past job-description analyses for a CV' })
  @ApiOkResponse({ type: [JobDescriptionEntity] })
  @ApiNotFoundResponse({ description: 'CV not found' })
  list(@GetUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.jobDescriptionsService.list(cvId, userId);
  }

  @Get(':jdId')
  @ApiOperation({ summary: 'Get one job-description analysis, with its generated suggestions' })
  @ApiOkResponse({ type: JobDescriptionDetailEntity })
  @ApiNotFoundResponse({ description: 'CV or job description analysis not found' })
  findOne(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('jdId') jdId: string,
  ) {
    return this.jobDescriptionsService.findOne(cvId, jdId, userId);
  }
}
