import { Module } from '@nestjs/common';
import { CvsModule } from '../cvs/cvs.module.js';
import { AiSuggestionsController } from './ai-suggestions.controller.js';
import { AiSuggestionsService } from './ai-suggestions.service.js';

@Module({
  imports: [CvsModule],
  controllers: [AiSuggestionsController],
  providers: [AiSuggestionsService],
})
export class AiSuggestionsModule {}
