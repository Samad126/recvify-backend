import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { AiSuggestionsService } from './ai-suggestions.service.js';
import { GenerateSuggestionsDto } from './dto/generate-suggestions.dto.js';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto.js';
import { ApplySuggestionsDto } from './dto/apply-suggestions.dto.js';
import { AiSuggestionEntity } from './dto/ai-suggestion.entity.js';

@ApiBearerAuth('accessToken')
@Controller('cvs/:cvId/ai-suggestions')
export class AiSuggestionsController {
  constructor(private readonly aiSuggestionsService: AiSuggestionsService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI rewrite suggestions for a CV (or a scoped section type)',
    description:
      'Calls Gemini once per improvable entry in scope (SUMMARY/EXPERIENCE text) and stores the results as PENDING suggestions.',
  })
  @ApiCreatedResponse({ type: [AiSuggestionEntity] })
  @ApiNotFoundResponse({ description: 'CV not found' })
  generate(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: GenerateSuggestionsDto,
  ) {
    return this.aiSuggestionsService.generate(cvId, userId, dto);
  }

  @Post('apply')
  @ApiOperation({
    summary: 'Apply ACCEPTED/EDITED suggestions into their CV entries',
    description: 'Writes each suggestion\'s text into its target entry field, in one transaction.',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: 'CV not found, or a suggestion id does not belong to it' })
  apply(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: ApplySuggestionsDto,
  ) {
    return this.aiSuggestionsService.apply(cvId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List AI suggestions for a CV' })
  @ApiOkResponse({ type: [AiSuggestionEntity] })
  @ApiNotFoundResponse({ description: 'CV not found' })
  list(@GetUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.aiSuggestionsService.list(cvId, userId);
  }

  @Patch(':suggestionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept, reject, edit, or undo a single suggestion',
  })
  @ApiOkResponse({ type: AiSuggestionEntity })
  @ApiNotFoundResponse({ description: 'CV or suggestion not found' })
  updateStatus(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('suggestionId') suggestionId: string,
    @Body() dto: UpdateSuggestionDto,
  ) {
    return this.aiSuggestionsService.updateStatus(cvId, suggestionId, userId, dto);
  }
}
