import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import {
  MSG_CAMPOS_OBLIGATORIOS,
  nivelDesdePuntaje,
  type ContenidoRespuesta,
  type ModuloDetalleDto,
  type PreguntaParticipanteDto,
} from '@regicap/types';
import { AppException, noEncontrado, reglaViolada } from '../common/errors';
import { CalificacionQueue } from '../calificacion/calificacion.queue';
import { aActividadDto, aPreguntaParticipanteDto } from '../modulos/modulos.mappers';
import { ProgresoCalculator } from '../progreso/progreso.calculator';
import { ProgresoRepository } from '../progreso/progreso.repository';
import { ProgresoService } from '../progreso/progreso.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.interface';
import { RespuestasRepository } from './respuestas.repository';

const LECTURA_SEGUNDOS = 15 * 60;

@Injectable()
export class RespuestasService {
  private readonly logger = new Logger(RespuestasService.name);
  private readonly calc = new ProgresoCalculator();

  constructor(
    private readonly repo: RespuestasRepository,
    private readonly progresoRepo: ProgresoRepository,
    private readonly progreso: ProgresoService,
    private readonly cola: CalificacionQueue,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** CU-05 — contenido del módulo + formulario + respuesta previa y calificación. */
  async detalle(participanteId: string, inscripcionId: string, moduloId: string): Promise<ModuloDetalleDto> {
    const { insc, modulo, preguntas } = await this.cargar(participanteId, inscripcionId, moduloId);
    const respuesta = await this.repo.findRespuesta(inscripcionId, moduloId);
    const estado = this.calc.estadoModulo(respuesta);
    const cal = respuesta?.calificacion ?? null;
    const calificada = estado === 'ENVIADO' && cal?.estado === 'CALIFICADA' && cal.puntaje !== null;

    const actividades = [];
    for (const a of modulo.actividades) {
      actividades.push(aActividadDto(a, a.archivoKey ? await this.storage.urlDeLectura(a.archivoKey, LECTURA_SEGUNDOS) : null));
    }

    return {
      id: modulo.id,
      inscripcionId,
      capacitacionNombre: insc.capacitacion.nombre,
      empresa: insc.capacitacion.empresa.nombre,
      nombre: modulo.nombre,
      orden: modulo.orden,
      tipo: modulo.tipo,
      actividades,
      preguntas,
      respuesta: respuesta ? (respuesta.contenido as unknown as ContenidoRespuesta) : null,
      estado,
      calificacion:
        estado === 'ENVIADO' && cal
          ? {
              estado: cal.estado,
              puntaje: calificada ? Number(cal.puntaje) : null,
              nivel: calificada ? nivelDesdePuntaje(Number(cal.puntaje)) : null,
              criterioMasBajo: calificada ? cal.criterioMasBajo : null,
            }
          : null,
      pendienteCalificacion: estado === 'ENVIADO' && !calificada,
    };
  }

  /** Guardar borrador (flujo alterno de CU-05). */
  async guardarBorrador(participanteId: string, inscripcionId: string, moduloId: string, dto: ContenidoRespuesta): Promise<ModuloDetalleDto> {
    const { insc, preguntas } = await this.cargar(participanteId, inscripcionId, moduloId);
    this.exigirActiva(insc.estado);
    const previa = await this.repo.findRespuesta(inscripcionId, moduloId);
    if (previa?.estado === 'ENVIADA') throw this.yaEnviado();
    await this.repo.guardarBorrador(inscripcionId, moduloId, this.limpiar(dto, preguntas) as unknown as Prisma.InputJsonValue);
    return this.detalle(participanteId, inscripcionId, moduloId);
  }

  /**
   * Enviar el módulo: persiste la Respuesta (ENVIADA) y su Calificación
   * (PENDIENTE) en una transacción y luego encola el trabajo; la API responde
   * de inmediato sin esperar a la IA (RNF-04, RNF-09).
   */
  async enviar(participanteId: string, inscripcionId: string, moduloId: string, dto: ContenidoRespuesta): Promise<ModuloDetalleDto> {
    const { insc, modulo, preguntas } = await this.cargar(participanteId, inscripcionId, moduloId);
    this.exigirActiva(insc.estado);
    const contenido = this.limpiar(dto, preguntas);
    this.validarCompleto(contenido, preguntas, modulo.tipo);

    let r;
    try {
      r = await this.repo.enviarEnTransaccion(inscripcionId, moduloId, contenido as unknown as Prisma.InputJsonValue, (tx) =>
        this.progreso.actualizarEstadoInscripcion(inscripcionId, tx),
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw this.yaEnviado(); // doble envío simultáneo
      throw e;
    }
    if (r.yaEnviada) throw this.yaEnviado();

    // Si Redis falla aquí, la respuesta NO se pierde: el barrido del worker la reencola.
    try {
      await this.cola.encolar(r.respuestaId);
    } catch (e) {
      this.logger.error(`No se pudo encolar ${r.respuestaId}: ${(e as Error).message}`);
    }
    return this.detalle(participanteId, inscripcionId, moduloId);
  }

  /* ─────────── Internos ─────────── */

  private async cargar(participanteId: string, inscripcionId: string, moduloId: string) {
    const insc = await this.progresoRepo.findDeParticipante(inscripcionId, participanteId);
    if (!insc || insc.estado === 'CANCELADA') throw noEncontrado('No se encontró la inscripción.');
    const modulo = await this.repo.findModulo(moduloId, insc.capacitacionId);
    if (!modulo) throw noEncontrado('No se encontró el módulo.');

    let preguntas: PreguntaParticipanteDto[];
    if (modulo.tipo === 'TEST') {
      // La evaluación final reúne los cuestionarios de todos los módulos de contenido + sus propias preguntas.
      const contenido = await this.repo.modulosDeContenidoConPreguntas(insc.capacitacionId);
      preguntas = [
        ...contenido.flatMap((m) => m.preguntas.map((p) => aPreguntaParticipanteDto(p, `Módulo ${m.orden} · ${m.nombre}`))),
        ...modulo.preguntas.map((p) => aPreguntaParticipanteDto(p, 'Preguntas de la evaluación final')),
      ];
    } else {
      preguntas = modulo.preguntas.map((p) => aPreguntaParticipanteDto(p));
    }
    return { insc, modulo, preguntas };
  }

  private exigirActiva(estado: string) {
    if (estado !== 'PENDIENTE' && estado !== 'EN_CURSO') {
      throw reglaViolada('INSCRIPCION_NO_ACTIVA', 'Esta inscripción ya no admite cambios.');
    }
  }

  private yaEnviado() {
    return reglaViolada('MODULO_ENVIADO', 'Este módulo ya fue enviado y no puede resolverse de nuevo.');
  }

  /** Solo se conservan respuestas a preguntas que pertenecen al módulo. */
  private limpiar(dto: ContenidoRespuesta, preguntas: PreguntaParticipanteDto[]): ContenidoRespuesta {
    const ids = new Set(preguntas.map((p) => p.id));
    return { reflexion: dto.reflexion, examen: dto.examen.filter((e) => ids.has(e.preguntaId)) };
  }

  /** Enviar exige responder todo; el mensaje queda junto a cada campo (FE-1). */
  private validarCompleto(contenido: ContenidoRespuesta, preguntas: PreguntaParticipanteDto[], tipo: string) {
    const campos: Record<string, string> = {};
    if (preguntas.length) {
      const dadas = new Map(contenido.examen.map((e) => [e.preguntaId, e.valor.trim()]));
      for (const p of preguntas) if (!dadas.get(p.id)) campos[p.id] = 'Responde esta pregunta.';
    } else if (tipo !== 'TEST') {
      if (!contenido.reflexion?.aprendido?.trim()) campos['reflexion.aprendido'] = MSG_CAMPOS_OBLIGATORIOS;
      if (!contenido.reflexion?.aplicacion?.trim()) campos['reflexion.aplicacion'] = MSG_CAMPOS_OBLIGATORIOS;
    }
    if (Object.keys(campos).length) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'CAMPOS_REQUERIDOS', MSG_CAMPOS_OBLIGATORIOS, campos);
    }
  }
}
