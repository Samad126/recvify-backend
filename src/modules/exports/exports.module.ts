import { Module } from '@nestjs/common';
import { CvsModule } from '../cvs/cvs.module.js';
import { ExportsController } from './exports.controller.js';
import { PublicCvController } from './public-cv.controller.js';
import { ExportsService } from './exports.service.js';

@Module({
  imports: [CvsModule],
  controllers: [ExportsController, PublicCvController],
  providers: [ExportsService],
})
export class ExportsModule {}
