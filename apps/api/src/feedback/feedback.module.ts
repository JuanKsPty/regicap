import { Module } from '@nestjs/common';
import { ResultadosModule } from '../resultados/resultados.module';
import { FeedbackAdminController, FeedbackParticipanteController } from './feedback.controller';
import { FeedbackRepository } from './feedback.repository';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [ResultadosModule],
  controllers: [FeedbackAdminController, FeedbackParticipanteController],
  providers: [FeedbackService, FeedbackRepository],
})
export class FeedbackModule {}
