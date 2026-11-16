import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { ENV, type Env } from '../config/env';

export const COLA_CALIFICACION = 'calificacion';
export const TRABAJO_CALIFICAR = 'calificar';

export interface TrabajoCalificar {
  respuestaId: string;
}

/**
 * Productor de la cola persistente de calificación (BullMQ + Redis AOF, D-08).
 * El id del trabajo ES el id de la respuesta → encolar dos veces no duplica (idempotente).
 */
@Injectable()
export class CalificacionQueue {
  private readonly logger = new Logger(CalificacionQueue.name);

  constructor(
    @InjectQueue(COLA_CALIFICACION) private readonly cola: Queue<TrabajoCalificar>,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async encolar(respuestaId: string): Promise<void> {
    const previo = await this.cola.getJob(respuestaId);
    if (previo) {
      const estado = await previo.getState();
      // Ya está esperando/ejecutándose: no se duplica.
      if (['waiting', 'active', 'delayed', 'prioritized', 'waiting-children'].includes(estado)) return;
      await previo.remove().catch(() => undefined); // terminado/fallido: se reemplaza (reencolar)
    }
    await this.cola.add(
      TRABAJO_CALIFICAR,
      { respuestaId },
      {
        jobId: respuestaId,
        attempts: this.env.calificacion.intentos,
        // 5 reintentos con espera exponencial (30 s, 60 s, 120 s…)
        backoff: { type: 'exponential', delay: this.env.calificacion.backoffMs },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: false,
      },
    );
    this.logger.debug(`Encolada calificación ${respuestaId}`);
  }
}
