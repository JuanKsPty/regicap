import { Inject, Injectable, Logger } from '@nestjs/common';
import { contenidoRespuestaSchema } from '@regicap/types';
import { ProgresoService } from '../progreso/progreso.service';
import { CalificacionRepository } from './calificacion.repository';
import { calificarModulo, type PreguntaCalificable } from './calificacion.scoring';
import { IA_PROVIDER, type IAProvider } from './ia/ia-provider.interface';

/**
 * Caso de uso CU-07 Procesar resultados (actor: IA, sin interfaz).
 * Lo invoca el worker de BullMQ; la API nunca espera a la IA (RNF-04).
 */
@Injectable()
export class CalificacionService {
  private readonly logger = new Logger(CalificacionService.name);

  constructor(
    private readonly repo: CalificacionRepository,
    private readonly progreso: ProgresoService,
    @Inject(IA_PROVIDER) private readonly ia: IAProvider,
  ) {}

  /** Califica la respuesta y deja la Calificación en CALIFICADA. Lanza si el proveedor falla (para reintentar). */
  async procesar(respuestaId: string, intento: number): Promise<void> {
    const r = await this.repo.findRespuestaParaCalificar(respuestaId);
    if (!r || r.estado !== 'ENVIADA') {
      this.logger.warn(`Respuesta ${respuestaId} inexistente o no enviada: se descarta el trabajo`);
      return;
    }
    if (r.calificacion?.estado === 'CALIFICADA') return; // idempotente: ya procesada

    const filas = await this.repo.preguntasDeEvaluacion(r.modulo);
    const preguntas: PreguntaCalificable[] = filas.map((p) => ({
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      peso: Number(p.peso),
      configuracion: p.configuracion,
      rubrica: p.rubrica,
    }));
    const contenido = contenidoRespuestaSchema.parse(r.contenido);

    const res = await calificarModulo(preguntas, contenido, this.ia);
    await this.repo.marcarCalificada(respuestaId, {
      puntaje: res.puntaje,
      nivel: res.nivel,
      criterioMasBajo: res.criterioMasBajo,
      detalle: res.detalle,
      intentos: intento,
    });
    // CU-04: el estado de la inscripción depende de los módulos enviados.
    await this.progreso.actualizarEstadoInscripcion(r.inscripcionId);
    this.logger.log(`Respuesta ${respuestaId} calificada: ${res.puntaje} (${res.nivel})`);
  }

  /** Falló un intento. Si se agotaron los reintentos la Calificación pasa a ERROR (se muestra "Pendiente de calificación"). */
  async registrarFallo(respuestaId: string, intentos: number, error: string, definitivo: boolean): Promise<void> {
    await this.repo.registrarFallo(respuestaId, intentos, error, definitivo);
    this.logger.warn(`Calificación ${respuestaId}: intento ${intentos} falló (${error})${definitivo ? ' → ERROR' : ''}`);
  }
}
