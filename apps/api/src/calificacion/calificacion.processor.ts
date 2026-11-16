import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { CalificacionService } from './calificacion.service';
import { COLA_CALIFICACION, type TrabajoCalificar } from './calificacion.queue';

/** Consumidor de la cola: corre en el contenedor `worker`, separado de la API. */
@Processor(COLA_CALIFICACION, { concurrency: 4 })
export class CalificacionProcessor extends WorkerHost {
  constructor(private readonly servicio: CalificacionService) {
    super();
  }

  async process(job: Job<TrabajoCalificar>): Promise<void> {
    await this.servicio.procesar(job.data.respuestaId, job.attemptsMade + 1);
  }

  @OnWorkerEvent('failed')
  async alFallar(job: Job<TrabajoCalificar> | undefined, error: Error): Promise<void> {
    if (!job) return;
    const maximo = job.opts.attempts ?? 1;
    await this.servicio.registrarFallo(job.data.respuestaId, job.attemptsMade, error.message, job.attemptsMade >= maximo);
  }
}
