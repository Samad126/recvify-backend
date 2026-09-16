import { Module } from '@nestjs/common';
import { CvsModule } from '../cvs/cvs.module.js';
import { JobDescriptionsController } from './job-descriptions.controller.js';
import { JobDescriptionsService } from './job-descriptions.service.js';

@Module({
  imports: [CvsModule],
  controllers: [JobDescriptionsController],
  providers: [JobDescriptionsService],
})
export class JobDescriptionsModule {}
