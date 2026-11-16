import { Body, Controller, Get, Query } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { feedbackSchema, type FeedbackContextoDto, type FeedbackInput, type FeedbackListadoDto, type FeedbackParticipanteDto } from '@regicap/types';
import { z } from 'zod';
import { CurrentUser, empresaDe, Roles, type UsuarioAuth } from '../common/decorators';
import { zod } from '../common/zod-validation.pipe';
import { FeedbackService } from './feedback.service';

const listadoQuery = z.object({ q: z.string().max(80).optional() });
const contextoQuery = z.object({ participanteId: z.string().uuid(), capacitacionId: z.string().uuid().optional() });

/** CU-10 Entregar feedback (Administrador). */
@Controller('admin/feedback')
@Roles('ADMINISTRADOR')
export class FeedbackAdminController {
  constructor(private readonly servicio: FeedbackService) {}

  @Get('participantes')
  listado(@CurrentUser() user: UsuarioAuth, @Query(zod(listadoQuery)) q: { q?: string }): Promise<FeedbackListadoDto> {
    return this.servicio.listado(empresaDe(user), q.q);
  }

  @Get('contexto')
  contexto(@CurrentUser() user: UsuarioAuth, @Query(zod(contextoQuery)) q: { participanteId: string; capacitacionId?: string }): Promise<FeedbackContextoDto> {
    return this.servicio.contexto(empresaDe(user), q.participanteId, q.capacitacionId);
  }

  @Post()
  enviar(@CurrentUser() user: UsuarioAuth, @Body(zod(feedbackSchema)) dto: FeedbackInput) {
    return this.servicio.enviar(empresaDe(user), user.id, dto);
  }
}

/** CU-06 Recibir feedback (Participante). */
@Controller('participante/feedback')
@Roles('PARTICIPANTE')
export class FeedbackParticipanteController {
  constructor(private readonly servicio: FeedbackService) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAuth): Promise<FeedbackParticipanteDto> {
    return this.servicio.delParticipante(user.id);
  }
}
