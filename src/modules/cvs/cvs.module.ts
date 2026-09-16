import { Module } from '@nestjs/common';
import { CvsController } from './cvs.controller.js';
import { CvsService } from './cvs.service.js';
import { CvSectionsService } from './cv-sections.service.js';
import { CvEntriesService } from './cv-entries.service.js';

@Module({
  controllers: [CvsController],
  providers: [CvsService, CvSectionsService, CvEntriesService],
})
export class CvsModule {}
