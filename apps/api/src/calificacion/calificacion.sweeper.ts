import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CalificacionRepository } from './calificacion.repository';
import { CalificacionQueue } from './calificacion.queue';

/**
 * Red de seguridad: si una respuesta se guardó (PENDIENTE) pero el trabajo
 * no llegó a encolarse (p. ej. Redis caído en ese instante), el worker lo
 * vuelve a encolar. Como el id del trabajo es el de la respuesta, es idempotente.
 */
@Injectable()
export class CalificacionSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CalificacionSweeper.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly repo: CalificacionRepository,
    private readonly cola: CalificacionQueue,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.barrer(), 60_000);
    setTimeout(() => void this.barrer(), 5_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async barrer() {
    try {
      const pendientes = await this.repo.pendientesAntiguas(2);
      for (const p of pendientes) await this.cola.encolar(p.respuestaId);
      if (pendientes.length) this.logger.log(`Reencoladas ${pendientes.length} calificaciones pendientes`);
    } catch (e) {
      this.logger.warn(`Barrido de calificaciones falló: ${(e as Error).message}`);
    }
  }
}
