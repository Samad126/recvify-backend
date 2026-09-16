import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { UploadsService } from './uploads.service.js';
import { UploadEntity } from './dto/upload.entity.js';
import { ACCEPTED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from './upload.constants.js';

@ApiBearerAuth('accessToken')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Upload a resume for AI parsing',
    description:
      'Accepts a PDF or DOCX file (max 10MB), extracts its content, and uses Gemini to parse it into structured resume data. Parsing happens synchronously — the response reflects the final parsedStatus (PARSED or FAILED).',
  })
  @ApiCreatedResponse({ type: UploadEntity })
  async create(
    @GetUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('file is required');
    if (!ACCEPTED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and DOCX files are supported');
    }
    return this.uploadsService.create(userId, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an upload and its parsed data' })
  @ApiOkResponse({ type: UploadEntity })
  @ApiNotFoundResponse({ description: 'Upload not found' })
  findOne(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.uploadsService.findByIdForUser(id, userId);
  }
}
