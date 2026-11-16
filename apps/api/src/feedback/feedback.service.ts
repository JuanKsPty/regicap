import { Injectable } from '@nestjs/common';
import {
  nivelDesdePuntaje,
  promedio,
  type ContenidoRespuesta,
  type FeedbackContextoDto,
  type FeedbackInput,
  type FeedbackListadoDto,
  type FeedbackParticipanteDto,
} from '@regicap/types';
import { noEncontrado } from '../common/errors';
import { ResultadosService } from '../resultados/resultados.service';
import { FeedbackRepository } from './feedback.repository';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly repo: FeedbackRepository,
    private readonly resultados: ResultadosService,
  ) {}

  /** CU-10: participantes de la Empresa priorizando bajo rendimiento. */
  async listado(empresaId: string, q?: string): Promise<FeedbackListadoDto> {
    const [filas, conteo] = await Promise.all([this.resultados.filas(empresaId, {}), this.repo.contarPorParticipante(empresaId)]);
    const porP = new Map<string, typeof filas>();
    for (const f of filas) porP.set(f.participanteId, [...(porP.get(f.participanteId) ?? []), f]);

    const termino = q?.trim().toLowerCase();
    const participantes = [...porP.entries()]
      .filter(([, fs]) => !termino || fs[0]!.participante.toLowerCase().includes(termino))
      .map(([id, fs]) => {
        const conPuntaje = fs.filter((f) => f.puntaje !== null);
        const peor = conPuntaje.length ? conPuntaje.reduce((m, f) => (f.puntaje! < m.puntaje! ? f : m)) : null;
        return {
          participanteId: id,
          nombre: fs[0]!.participante,
          inscripciones: fs.length,
          peorPuntaje: peor?.puntaje ?? null,
          peorNivel: peor?.nivel ?? null,
          peorCapacitacionId: peor?.capacitacionId ?? null,
          feedbacks: conteo.get(id) ?? 0,
        };
      })
      .sort((a, b) => (a.peorPuntaje ?? 999) - (b.peorPuntaje ?? 999) || a.nombre.localeCompare(b.nombre));

    return { participantes, bajoRendimiento: filas.filter((f) => f.nivel === 'BAJO').length };
  }

  /** Respuesta del participante ya clasificada por la IA + historial de feedback (panel derecho de CU-10). */
  async contexto(empresaId: string, participanteId: string, capacitacionId?: string): Promise<FeedbackContextoDto> {
    const filas = await this.resultados.filas(empresaId, { participanteId });
    if (!filas.length) throw noEncontrado('No se encontró al participante.');
    const conPuntaje = filas.filter((f) => f.puntaje !== null);
    const peor = conPuntaje.length ? conPuntaje.reduce((m, f) => (f.puntaje! < m.puntaje! ? f : m)) : null;
    const capId = capacitacionId ?? peor?.capacitacionId ?? filas[0]!.capacitacionId;
    const fila = filas.find((f) => f.capacitacionId === capId);
    if (!fila) throw noEncontrado('El participante no está inscrito en esa capacitación.');

    const [ultima, historial] = await Promise.all([this.repo.ultimaRespuesta(participanteId, capId), this.repo.historial(empresaId, participanteId, capId)]);
    let respuesta: FeedbackContextoDto['respuesta'] = null;
    if (ultima) {
      const cal = ultima.calificacion;
      const calificada = cal?.estado === 'CALIFICADA' && cal.puntaje !== null;
      respuesta = {
        modulo: ultima.modulo.nombre,
        texto: this.resumirRespuesta(ultima.contenido as unknown as ContenidoRespuesta),
        puntaje: calificada ? Number(cal.puntaje) : null,
        nivel: calificada ? nivelDesdePuntaje(Number(cal.puntaje)) : null,
        criterioMasBajo: calificada ? cal.criterioMasBajo : null,
        pendienteCalificacion: !calificada,
      };
    }
    return {
      participanteId,
      nombre: fila.participante,
      capacitaciones: filas.map((f) => ({ id: f.capacitacionId, nombre: f.capacitacion })),
      capacitacionId: capId,
      respuesta,
      puntajeCapacitacion: fila.puntaje,
      historial: historial.map((h) => ({ id: h.id, texto: h.texto, fecha: h.fecha.toISOString() })),
    };
  }

  /** CU-10: guarda el feedback (se acumula, nunca se sobrescribe). Visible para el Participante en CU-06. */
  async enviar(empresaId: string, administradorId: string, dto: FeedbackInput) {
    if (!(await this.repo.tieneInscripcion(empresaId, dto.participanteId, dto.capacitacionId))) {
      throw noEncontrado('El participante no está inscrito en esa capacitación.');
    }
    const f = await this.repo.crear({ administradorId, participanteId: dto.participanteId, capacitacionId: dto.capacitacionId, texto: dto.texto });
    return { id: f.id, texto: f.texto, fecha: f.fecha.toISOString() };
  }

  /** CU-06 Recibir feedback (Participante): vigentes e históricas, agrupado por capacitación. */
  async delParticipante(participanteId: string): Promise<FeedbackParticipanteDto> {
    const fbs = await this.repo.delParticipante(participanteId);
    const capIds = [...new Set(fbs.map((f) => f.capacitacionId))];
    const insc = await this.repo.inscripcionesDe(participanteId, capIds);
    const vigente = (capId: string) => insc.find((i) => i.capacitacionId === capId && i.estado !== 'CANCELADA') ?? insc.find((i) => i.capacitacionId === capId);
    const cals = await this.repo.puntajes(insc.map((i) => i.id));

    const grupos = capIds.map((capId) => {
      const items = fbs.filter((f) => f.capacitacionId === capId);
      const i = vigente(capId);
      const p = i ? promedio(cals.filter((c) => c.respuesta.inscripcionId === i.id).map((c) => Number(c.puntaje))) : null;
      const cap = items[0]!.capacitacion;
      return {
        capacitacionId: capId,
        titulo: cap.nombre,
        empresa: cap.empresa.nombre,
        estadoInscripcion: i?.estado ?? null,
        puntaje: p,
        nivel: p === null ? null : nivelDesdePuntaje(p),
        items: items.map((f) => ({ id: f.id, texto: f.texto, fecha: f.fecha.toISOString(), administrador: f.administrador.nombre })),
      };
    });
    return { total: fbs.length, capacitaciones: capIds.length, ultimo: fbs[0]?.fecha.toISOString() ?? null, grupos };
  }

  private resumirRespuesta(c: ContenidoRespuesta): string {
    const reflexion = c.reflexion?.aprendido?.trim() || c.reflexion?.aplicacion?.trim();
    if (reflexion) return reflexion;
    const dadas = c.examen.filter((e) => e.valor.trim()).slice(0, 3).map((e) => e.valor.trim());
    return dadas.length ? `Respuestas del test: ${dadas.join(' · ')}` : 'Sin texto de respuesta.';
  }
}
