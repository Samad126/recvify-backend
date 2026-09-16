import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mammoth from 'mammoth';
import { DatabaseService } from '../../common/database/database.service.js';
import { GeminiService } from '../../common/gemini/gemini.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PDF_MIME_TYPE } from './upload.constants.js';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly gemini: GeminiService,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
  }

  async create(userId: string, file: Express.Multer.File) {
    await mkdir(this.uploadDir, { recursive: true });
    const storedFilename = `${randomUUID()}${extname(file.originalname)}`;
    await writeFile(join(this.uploadDir, storedFilename), file.buffer);

    const upload = await this.db.upload.create({
      data: {
        userId,
        fileUrl: join(this.uploadDir, storedFilename),
        parsedStatus: 'PENDING',
      },
    });

    try {
      const parsedData =
        file.mimetype === PDF_MIME_TYPE
          ? await this.gemini.parseResume({ pdfBase64: file.buffer.toString('base64') })
          : await this.gemini.parseResume({ text: await this.extractDocxText(file.buffer) });

      return await this.db.upload.update({
        where: { id: upload.id },
        data: {
          parsedStatus: 'PARSED',
          parsedData: parsedData as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Parsing failed for upload ${upload.id}: ${(err as Error).message}`,
      );
      return this.db.upload.update({
        where: { id: upload.id },
        data: { parsedStatus: 'FAILED' },
      });
    }
  }

  async findByIdForUser(id: string, userId: string) {
    const upload = await this.db.upload.findUnique({ where: { id } });
    if (!upload || upload.userId !== userId) {
      throw new NotFoundException('Upload not found');
    }
    return upload;
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
}
