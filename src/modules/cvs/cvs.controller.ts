import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { ACCEPTED_PHOTO_MIME_TYPES, MAX_PHOTO_SIZE_BYTES } from './photo.constants.js';
import { CvsService } from './cvs.service.js';
import { CvSectionsService } from './cv-sections.service.js';
import { CvEntriesService } from './cv-entries.service.js';
import { CreateCvDto } from './dto/create-cv.dto.js';
import { CreateCvFromUploadDto } from './dto/create-cv-from-upload.dto.js';
import { UpdateCvDto } from './dto/update-cv.dto.js';
import { ListCvsDto } from './dto/list-cvs.dto.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { ReorderDto } from './dto/reorder.dto.js';
import { CreateEntryDto } from './dto/create-entry.dto.js';
import { UpdateEntryDto } from './dto/update-entry.dto.js';
import {
  CvDetailEntity,
  CvEntryEntity,
  CvListItemEntity,
  CvSectionEntity,
  PaginatedCvsEntity,
} from './dto/cv.entity.js';
import {
  CertificationFieldsDto,
  CustomFieldsDto,
  EducationFieldsDto,
  ExperienceFieldsDto,
  SkillsFieldsDto,
  SummaryFieldsDto,
} from './dto/section-fields.dto.js';

@ApiBearerAuth('accessToken')
@ApiExtraModels(
  SummaryFieldsDto,
  ExperienceFieldsDto,
  EducationFieldsDto,
  SkillsFieldsDto,
  CertificationFieldsDto,
  CustomFieldsDto,
)
@Controller('cvs')
export class CvsController {
  constructor(
    private readonly cvsService: CvsService,
    private readonly sectionsService: CvSectionsService,
    private readonly entriesService: CvEntriesService,
  ) {}

  // ---------------------------------------------------------------------
  // CVs
  // ---------------------------------------------------------------------

  @Post()
  @ApiOperation({ summary: 'Create a new CV from a template' })
  @ApiCreatedResponse({ type: CvListItemEntity })
  @ApiNotFoundResponse({ description: 'Template not found' })
  create(@GetUser('sub') userId: string, @Body() dto: CreateCvDto) {
    return this.cvsService.create(userId, dto);
  }

  @Post('from-upload')
  @ApiOperation({
    summary: 'Create a CV from a reviewed upload (parsed-data-review "Save & Continue")',
    description:
      'Atomically creates the CV plus its SUMMARY/EXPERIENCE/EDUCATION/SKILLS sections and entries from the (possibly user-edited) reviewed data.',
  })
  @ApiCreatedResponse({ type: CvDetailEntity })
  @ApiNotFoundResponse({ description: 'Upload or template not found' })
  createFromUpload(@GetUser('sub') userId: string, @Body() dto: CreateCvFromUploadDto) {
    return this.cvsService.createFromUpload(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's CVs (dashboard), most recently edited first" })
  @ApiOkResponse({ type: PaginatedCvsEntity })
  list(@GetUser('sub') userId: string, @Query() query: ListCvsDto) {
    return this.cvsService.list(userId, query);
  }

  @Get(':cvId')
  @ApiOperation({ summary: 'Get the full CV graph (sections + entries) for the editor' })
  @ApiOkResponse({ type: CvDetailEntity })
  @ApiNotFoundResponse({ description: 'CV not found' })
  findOne(@GetUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.cvsService.findByIdForUser(cvId, userId);
  }

  @Patch(':cvId')
  @ApiOperation({
    summary: 'Update CV title, template, or style overrides',
    description: 'Used by the editor header (title/template) and style-controls panel (font/color/theme).',
  })
  @ApiOkResponse({ type: CvListItemEntity })
  @ApiNotFoundResponse({ description: 'CV or template not found' })
  update(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: UpdateCvDto,
  ) {
    return this.cvsService.update(cvId, userId, dto);
  }

  @Delete(':cvId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a CV' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'CV not found' })
  remove(@GetUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.cvsService.remove(cvId, userId);
  }

  @Post(':cvId/photo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Upload (or replace) this CV\'s profile photo',
    description: 'Accepts a JPEG/PNG/WebP image (max 5MB). Replaces any existing photo.',
  })
  @ApiOkResponse({ description: 'Returns { id, photoUrl }' })
  @ApiNotFoundResponse({ description: 'CV not found' })
  uploadPhoto(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('file is required');
    if (!ACCEPTED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are supported');
    }
    return this.cvsService.uploadPhoto(cvId, userId, file);
  }

  @Delete(':cvId/photo')
  @ApiOperation({ summary: "Remove this CV's profile photo" })
  @ApiOkResponse({ description: 'Returns { id, photoUrl: null }' })
  @ApiNotFoundResponse({ description: 'CV not found' })
  removePhoto(@GetUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.cvsService.removePhoto(cvId, userId);
  }

  // ---------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------

  @Post(':cvId/sections')
  @ApiOperation({ summary: 'Add a section to a CV (appended to the end)' })
  @ApiCreatedResponse({ type: CvSectionEntity })
  @ApiNotFoundResponse({ description: 'CV not found' })
  createSection(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.sectionsService.create(cvId, userId, dto);
  }

  @Patch(':cvId/sections/reorder')
  @ApiOperation({ summary: 'Bulk-update section sort order (drag-and-drop)' })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: 'CV not found, or a section id does not belong to it' })
  reorderSections(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.sectionsService.reorder(cvId, userId, dto);
  }

  @Patch(':cvId/sections/:sectionId')
  @ApiOperation({ summary: "Rename a section's title" })
  @ApiOkResponse({ type: CvSectionEntity })
  @ApiNotFoundResponse({ description: 'CV or section not found' })
  updateSection(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(cvId, sectionId, userId, dto);
  }

  @Delete(':cvId/sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section and all of its entries' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'CV or section not found' })
  removeSection(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.sectionsService.remove(cvId, sectionId, userId);
  }

  // ---------------------------------------------------------------------
  // Entries
  // ---------------------------------------------------------------------

  @Post(':cvId/sections/:sectionId/entries')
  @ApiOperation({
    summary: 'Add an entry to a section',
    description:
      "fieldsJson is validated against the parent section's sectionType (see SummaryFieldsDto/ExperienceFieldsDto/EducationFieldsDto/SkillsFieldsDto/CertificationFieldsDto/CustomFieldsDto schemas).",
  })
  @ApiCreatedResponse({ type: CvEntryEntity })
  @ApiNotFoundResponse({ description: 'CV or section not found' })
  createEntry(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateEntryDto,
  ) {
    return this.entriesService.create(cvId, sectionId, userId, dto);
  }

  @Patch(':cvId/sections/:sectionId/entries/reorder')
  @ApiOperation({ summary: 'Bulk-update entry sort order within a section (drag-and-drop)' })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: 'CV/section not found, or an entry id does not belong to it' })
  reorderEntries(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.entriesService.reorder(cvId, sectionId, userId, dto);
  }

  @Patch(':cvId/sections/:sectionId/entries/:entryId')
  @ApiOperation({
    summary: 'Partially update an entry (autosave)',
    description: 'Only the keys present in fieldsJson are validated and merged into the stored entry.',
  })
  @ApiOkResponse({ type: CvEntryEntity })
  @ApiNotFoundResponse({ description: 'CV, section, or entry not found' })
  updateEntry(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('sectionId') sectionId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.entriesService.update(cvId, sectionId, entryId, userId, dto);
  }

  @Delete(':cvId/sections/:sectionId/entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an entry' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'CV, section, or entry not found' })
  removeEntry(
    @GetUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Param('sectionId') sectionId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.entriesService.remove(cvId, sectionId, entryId, userId);
  }
}
