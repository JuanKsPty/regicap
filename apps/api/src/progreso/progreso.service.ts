import { Injectable } from '@nestjs/common';
import { nivelDesdePuntaje, type ModuloEstadoDto, type ProgresoDto } from '@regicap/types';
import { noEncontrado } from '../common/errors';
import { ProgresoCalculator } from './progreso.calculator';
import { ProgresoRepository, type Db } from './progreso.repository';

@Injectable()
export class ProgresoService {
  private readonly calc = new ProgresoCalculator();

  constructor(private readonly repo: ProgresoRepository) {}

  /** CU-04 2.1.2 — capacitaciones activas con su progreso (una consulta agregada). */
  async activasConProgreso(participanteId: string): Promise<ProgresoDto[]> {
    const insc = await this.repo.activasDeParticipante(participanteId);
    const enviadas = await this.repo.enviadasPorInscripcion(insc.map((i) => i.id));
    const totales = await this.repo.totalModulosPorCapacitacion([...new Set(insc.map((i) => i.capacitacionId))]);
    return insc.map((i) => {
      const enviados = enviadas.get(i.id) ?? 0;
      const total = totales.get(i.capacitacionId) ?? 0;
      return {
        inscripcionId: i.id,
        titulo: i.capacitacion.nombre,
        empresa: i.capacitacion.empresa.nombre,
        estado: i.estado,
        enviados,
        total,
        porcentaje: this.calc.porcentaje(enviados, total),
      };
    });
  }

  /** CU-04 2.1.4 — módulos de una inscripción con su estado derivado (404 si no es del Participante). */
  async modulosDeInscripcion(participanteId: string, inscripcionId: string): Promise<ModuloEstadoDto[]> {
    const insc = await this.repo.findDeParticipante(inscripcionId, participanteId);
    if (!insc || insc.estado === 'CANCELADA') throw noEncontrado('No se encontró la inscripción.');
    const modulos = await this.repo.modulosConRespuesta(insc.capacitacionId, inscripcionId);
    // Preguntas que hereda el módulo TEST de los módulos de contenido
    const heredadas = modulos.filter((m) => m.tipo === 'CONTENIDO').reduce((a, m) => a + m._count.preguntas, 0);

    return modulos.map((m) => {
      const r = m.respuestas[0] ?? null;
      const estado = this.calc.estadoModulo(r);
      const cal = r?.calificacion ?? null;
      const calificada = estado === 'ENVIADO' && cal?.estado === 'CALIFICADA' && cal.puntaje !== null;
      const preguntas = m.tipo === 'TEST' ? heredadas + m._count.preguntas : m._count.preguntas;
      return {
        id: m.id,
        titulo: m.nombre,
        orden: m.orden,
        tipo: m.tipo,
        actividades: m._count.actividades,
        preguntas,
        tieneTest: preguntas > 0,
        estado,
        puntaje: calificada ? Number(cal!.puntaje) : null,
        nivel: calificada ? nivelDesdePuntaje(Number(cal!.puntaje)) : null,
        // Se muestra "Pendiente de calificación" mientras la IA procesa o si falló tras los reintentos.
        pendienteCalificacion: estado === 'ENVIADO' && !calificada,
      };
    });
  }

  /**
   * Recalcula y guarda el estado de la inscripción a partir de los módulos
   * enviados (D-11). Se invoca al enviar un módulo (CU-05) y al calificarlo
   * (CU-07). Nunca modifica una inscripción CANCELADA.
   */
  async actualizarEstadoInscripcion(inscripcionId: string, db?: Db): Promise<void> {
    const insc = await this.repo.inscripcionBasica(inscripcionId, db);
    if (!insc || insc.estado === 'CANCELADA') return;
    const enviados = (await this.repo.enviadasPorInscripcion([inscripcionId], db)).get(inscripcionId) ?? 0;
    const total = (await this.repo.totalModulosPorCapacitacion([insc.capacitacionId], db)).get(insc.capacitacionId) ?? 0;
    const nuevo = this.calc.estadoInscripcion(enviados, total, insc.estado);
    if (nuevo !== insc.estado && nuevo !== 'CANCELADA') await this.repo.actualizarEstado(inscripcionId, nuevo, db);
  }
}
