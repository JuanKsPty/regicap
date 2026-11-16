import { BullModule } from '@nestjs/bullmq';
import { Controller, HttpCode, Module, Post } from '@nestjs/common';
import { ProgresoModule } from '../progreso/progreso.module';
import { CurrentUser, empresaDe, Roles, type UsuarioAuth } from '../common/decorators';
import { ENV, cargarEnv, type Env } from '../config/env';
import { CalificacionProcessor } from './calificacion.processor';
import { CalificacionQueue, COLA_CALIFICACION } from './calificacion.queue';
import { CalificacionRepository } from './calificacion.repository';
import { CalificacionService } from './calificacion.service';
import { CalificacionSweeper } from './calificacion.sweeper';
import { AnthropicIAProvider } from './ia/anthropic-ia.provider';
import { IA_PROVIDER } from './ia/ia-provider.interface';
import { MockIAProvider } from './ia/mock-ia.provider';

export function conexionRedis(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0,
    tls: u.protocol === 'rediss:' ? {} : undefined,
  };
}

/** Cola + productor + repositorio: lo importan la API (encola) y el worker (consume). */
@Module({
  imports: [
    BullModule.forRootAsync({ useFactory: () => ({ connection: conexionRedis(cargarEnv().redisUrl) }) }),
    BullModule.registerQueue({ name: COLA_CALIFICACION }),
  ],
  providers: [CalificacionQueue, CalificacionRepository],
  exports: [CalificacionQueue, CalificacionRepository],
})
export class CalificacionColaModule {}

/** Admin: reencolar las calificaciones que quedaron en ERROR (se vuelven a procesar sin pérdida). */
@Controller('admin/calificaciones')
@Roles('ADMINISTRADOR')
export class CalificacionAdminController {
  constructor(
    private readonly repo: CalificacionRepository,
    private readonly cola: CalificacionQueue,
  ) {}

  @HttpCode(200)
  @Post('reencolar')
  async reencolar(@CurrentUser() user: UsuarioAuth): Promise<{ reencoladas: number }> {
    const ids = await this.repo.reiniciarErrores(empresaDe(user));
    for (const id of ids) await this.cola.encolar(id);
    return { reencoladas: ids.length };
  }
}

@Module({
  imports: [CalificacionColaModule],
  controllers: [CalificacionAdminController],
})
export class CalificacionApiModule {}

/** Proveedor de IA elegido por configuración (IA_PROVIDER), sin tocar los servicios. */
const iaProvider = {
  provide: IA_PROVIDER,
  inject: [ENV],
  useFactory: (env: Env) => (env.ia.provider === 'anthropic' ? new AnthropicIAProvider(env) : new MockIAProvider(env)),
};

/** Solo en el proceso `worker`: procesador + servicio de calificación + barrido. */
@Module({
  imports: [CalificacionColaModule, ProgresoModule],
  providers: [CalificacionService, CalificacionProcessor, CalificacionSweeper, iaProvider],
})
export class CalificacionWorkerModule {}
