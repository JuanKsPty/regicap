import { Injectable } from '@nestjs/common';
import {
  cohorteDe,
  nivelDesdePuntaje,
  promedio,
  type AnalisisDto,
  type AnalisisParticipanteDto,
  type BarraCapacitacionDto,
  type DecisionDto,
  type DetalleCapacitacionDto,
  type DistribucionDto,
  type FilaResultadoDto,
  type FiltrosResultados,
  type ResultadosDto,
} from '@regicap/types';
import ExcelJS from 'exceljs';
import { noEncontrado } from '../common/errors';
import { ProgresoRepository } from '../progreso/progreso.repository';
import { ResultadosRepository } from './resultados.repository';

@Injectable()
export class ResultadosService {
  constructor(
    private readonly repo: ResultadosRepository,
    private readonly progresoRepo: ProgresoRepository,
  ) {}

  /**
   * Una fila por inscripción vigente con su puntaje (promedio simple de los
   * módulos CALIFICADOS — Fase 2 §3.5) y su nivel. Consulta agregada: sin N+1.
   */
  async filas(empresaId: string, filtros: FiltrosResultados): Promise<FilaResultadoDto[]> {
    const insc = await this.repo.inscripciones(empresaId, filtros);
    const ids = insc.map((i) => i.id);
    const [cals, enviadas, totales] = await Promise.all([
      this.repo.calificadas(ids),
      this.progresoRepo.enviadasPorInscripcion(ids),
      this.progresoRepo.totalModulosPorCapacitacion([...new Set(insc.map((i) => i.capacitacionId))]),
    ]);
    const puntajes = new Map<string, number[]>();
    for (const c of cals) {
      const k = c.respuesta.inscripcionId;
      puntajes.set(k, [...(puntajes.get(k) ?? []), Number(c.puntaje)]);
    }
    return insc.map((i) => {
      const p = promedio(puntajes.get(i.id) ?? []);
      return {
        inscripcionId: i.id,
        participanteId: i.participanteId,
        participante: i.participante.nombre,
        capacitacionId: i.capacitacionId,
        capacitacion: i.capacitacion.nombre,
        estado: i.estado,
        cohorte: cohorteDe(i.fechaInscripcion),
        fechaInscripcion: i.fechaInscripcion.toISOString(),
        puntaje: p,
        nivel: p === null ? null : nivelDesdePuntaje(p),
        modulosEnviados: enviadas.get(i.id) ?? 0,
        modulosTotal: totales.get(i.capacitacionId) ?? 0,
      };
    });
  }

  private distribucion(filas: FilaResultadoDto[]): DistribucionDto {
    const d = { alto: 0, medio: 0, bajo: 0, total: 0 };
    for (const f of filas) {
      if (!f.nivel) continue;
      d[f.nivel === 'ALTO' ? 'alto' : f.nivel === 'MEDIO' ? 'medio' : 'bajo'] += 1;
      d.total += 1;
    }
    return d;
  }

  private porCapacitacion(filas: FilaResultadoDto[], caps: { id: string; nombre: string; estado: string }[], soloId?: string): BarraCapacitacionDto[] {
    return caps
      .filter((c) => (soloId ? c.id === soloId : c.estado === 'PUBLICADA' || filas.some((f) => f.capacitacionId === c.id)))
      .map((c) => {
        const mias = filas.filter((f) => f.capacitacionId === c.id);
        return {
          capacitacionId: c.id,
          nombre: c.nombre,
          puntaje: promedio(mias.flatMap((f) => (f.puntaje === null ? [] : [f.puntaje]))),
          participantes: mias.length,
        };
      });
  }

  /** CU-08 Consultar resultados: dashboard con filtros. */
  async consultar(empresaId: string, filtros: FiltrosResultados): Promise<ResultadosDto> {
    const [filas, caps, todas, estados] = await Promise.all([
      this.filas(empresaId, filtros),
      this.repo.capacitacionesDeEmpresa(empresaId),
      this.filas(empresaId, {}),
      this.repo.contarCalificaciones(empresaId),
    ]);
    const dist = this.distribucion(filas);
    const barras = this.porCapacitacion(filas, caps, filtros.capacitacionId);
    const conPuntaje = barras.filter((b) => b.puntaje !== null);
    const masDebil = conPuntaje.length ? conPuntaje.reduce((m, b) => (b.puntaje! < m.puntaje! ? b : m)) : null;
    const completadas = filas.filter((f) => f.estado === 'COMPLETADA').length;

    return {
      metricas: {
        participantes: new Set(filas.map((f) => f.participanteId)).size,
        puntajePromedio: promedio(filas.flatMap((f) => (f.puntaje === null ? [] : [f.puntaje]))),
        tasaCompletitud: filas.length ? Math.round((completadas / filas.length) * 100) : 0,
        rendimientoAlto: dist.total ? Math.round((dist.alto / dist.total) * 100) : 0,
      },
      porCapacitacion: barras,
      capacitacionMasDebil: masDebil ? { id: masDebil.capacitacionId, nombre: masDebil.nombre, puntaje: masDebil.puntaje! } : null,
      distribucion: dist,
      filas,
      calificacionesConError: estados.errores,
      calificacionesPendientes: estados.pendientes,
      opciones: {
        capacitaciones: caps.map((c) => ({ id: c.id, nombre: c.nombre })),
        participantes: [...new Map(todas.map((f) => [f.participanteId, f.participante])).entries()]
          .map(([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        cohortes: [...new Set(todas.map((f) => f.cohorte))].sort().reverse(),
      },
    };
  }

  /** Detalle de una capacitación: puntaje por módulo y participantes. */
  async detalleCapacitacion(empresaId: string, capacitacionId: string): Promise<DetalleCapacitacionDto> {
    const cap = await this.repo.findCapacitacionScoped(capacitacionId, empresaId);
    if (!cap) throw noEncontrado('No se encontró la capacitación.');
    const filas = await this.filas(empresaId, { capacitacionId });
    const cals = await this.repo.calificadas(filas.map((f) => f.inscripcionId));
    return {
      capacitacionId: cap.id,
      nombre: cap.nombre,
      empresa: cap.empresa.nombre,
      modulos: cap.modulos.map((m) => {
        const mias = cals.filter((c) => c.respuesta.moduloId === m.id).map((c) => Number(c.puntaje));
        return { moduloId: m.id, nombre: m.nombre, orden: m.orden, puntaje: promedio(mias), respuestas: mias.length };
      }),
      participantes: filas,
    };
  }

  /** Análisis individual de un participante (solo lo que cursa en esta Empresa). */
  async analisisParticipante(empresaId: string, participanteId: string): Promise<AnalisisParticipanteDto> {
    const insc = await this.repo.inscripcionesConDetalle(empresaId, participanteId);
    if (!insc.length) throw noEncontrado('No se encontró al participante.');
    const criterios = new Map<string, number>();

    const porCapacitacion = insc.map((i) => {
      const modulos = i.capacitacion.modulos.map((m) => {
        const r = i.respuestas.find((x) => x.moduloId === m.id) ?? null;
        const cal = r?.calificacion ?? null;
        const calificada = cal?.estado === 'CALIFICADA' && cal.puntaje !== null;
        if (calificada && cal.criterioMasBajo) criterios.set(cal.criterioMasBajo, (criterios.get(cal.criterioMasBajo) ?? 0) + 1);
        return {
          moduloId: m.id,
          nombre: m.nombre,
          orden: m.orden,
          enviado: !!r,
          puntaje: calificada ? Number(cal.puntaje) : null,
          nivel: calificada ? nivelDesdePuntaje(Number(cal.puntaje)) : null,
          criterioMasBajo: calificada ? cal.criterioMasBajo : null,
          pendienteCalificacion: !!r && !calificada,
        };
      });
      return {
        capacitacionId: i.capacitacionId,
        nombre: i.capacitacion.nombre,
        estado: i.estado,
        puntaje: promedio(modulos.flatMap((m) => (m.puntaje === null ? [] : [m.puntaje]))),
        modulos,
      };
    });
    const prom = promedio(porCapacitacion.flatMap((c) => (c.puntaje === null ? [] : [c.puntaje])));
    return {
      participanteId,
      nombre: insc[0]!.participante.nombre,
      email: insc[0]!.participante.email,
      promedio: prom,
      nivel: prom === null ? null : nivelDesdePuntaje(prom),
      inscripciones: insc.length,
      completadas: insc.filter((i) => i.estado === 'COMPLETADA').length,
      porCapacitacion,
      aReforzar: [...criterios.entries()]
        .map(([criterio, modulos]) => ({ criterio, modulos }))
        .sort((a, b) => b.modulos - a.modulos)
        .slice(0, 3),
    };
  }

  /** CU-08 "Exportar reporte": XLSX con los mismos filtros. */
  async exportarXlsx(empresaId: string, filtros: FiltrosResultados): Promise<Buffer> {
    const datos = await this.consultar(empresaId, filtros);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'REGICAP';
    wb.created = new Date();

    const resumen = wb.addWorksheet('Resumen');
    resumen.columns = [{ header: 'Métrica', key: 'm', width: 32 }, { header: 'Valor', key: 'v', width: 18 }];
    resumen.addRows([
      { m: 'Participantes', v: datos.metricas.participantes },
      { m: 'Puntaje promedio', v: datos.metricas.puntajePromedio ?? '—' },
      { m: 'Tasa de completitud (%)', v: datos.metricas.tasaCompletitud },
      { m: 'Rendimiento alto (%)', v: datos.metricas.rendimientoAlto },
      { m: 'Distribución · Alto', v: datos.distribucion.alto },
      { m: 'Distribución · Medio', v: datos.distribucion.medio },
      { m: 'Distribución · Bajo', v: datos.distribucion.bajo },
    ]);
    resumen.getRow(1).font = { bold: true };

    const hoja = wb.addWorksheet('Resultados');
    hoja.columns = [
      { header: 'Participante', key: 'participante', width: 28 },
      { header: 'Capacitación', key: 'capacitacion', width: 34 },
      { header: 'Cohorte', key: 'cohorte', width: 10 },
      { header: 'Fecha de inscripción', key: 'fecha', width: 20 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Módulos enviados', key: 'enviados', width: 17 },
      { header: 'Módulos totales', key: 'total', width: 16 },
      { header: 'Puntaje', key: 'puntaje', width: 10 },
      { header: 'Nivel', key: 'nivel', width: 10 },
    ];
    for (const f of datos.filas) {
      hoja.addRow({
        participante: f.participante,
        capacitacion: f.capacitacion,
        cohorte: f.cohorte,
        fecha: f.fechaInscripcion.slice(0, 10),
        estado: f.estado,
        enviados: f.modulosEnviados,
        total: f.modulosTotal,
        puntaje: f.puntaje ?? '',
        nivel: f.nivel ?? '',
      });
    }
    hoja.getRow(1).font = { bold: true };
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
    hoja.autoFilter = { from: 'A1', to: 'I1' };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /* ───────────── CU-09 Analizar resultados ───────────── */

  async analizar(empresaId: string): Promise<AnalisisDto> {
    const [filas, caps, aplicadas] = await Promise.all([
      this.filas(empresaId, {}),
      this.repo.capacitacionesDeEmpresa(empresaId),
      this.repo.aplicadas(empresaId),
    ]);
    const actual = cohorteDe(new Date());
    const barras = this.porCapacitacion(filas, caps).filter((b) => b.puntaje !== null);
    const debil = barras.length ? barras.reduce((m, b) => (b.puntaje! < m.puntaje! ? b : m)) : null;
    const fuerte = barras.length ? barras.reduce((m, b) => (b.puntaje! > m.puntaje! ? b : m)) : null;

    const porCohorte = new Map<string, FilaResultadoDto[]>();
    for (const f of filas) porCohorte.set(f.cohorte, [...(porCohorte.get(f.cohorte) ?? []), f]);
    if (!porCohorte.has(actual)) porCohorte.set(actual, []);
    const evolucion = [...porCohorte.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, fs]) => ({
        periodo,
        puntajePromedio: promedio(fs.flatMap((f) => (f.puntaje === null ? [] : [f.puntaje]))),
        participantes: new Set(fs.map((f) => f.participanteId)).size,
        actual: periodo === actual,
      }));

    const participantes = new Set(filas.map((f) => f.participanteId));
    const conActividad = new Set(filas.filter((f) => f.modulosEnviados > 0).map((f) => f.participanteId));
    const dist = this.distribucion(filas);

    const hechas = new Set(aplicadas.map((a) => a.clave));
    const decisiones: DecisionDto[] = [];
    const add = (clave: string, tipo: DecisionDto['tipo'], texto: string) => decisiones.push({ clave, tipo, texto, aplicada: hechas.has(clave) });
    if (debil && debil.puntaje! < 80) {
      add(`rediseñar:${debil.capacitacionId}`, 'warning', `Rediseñar el contenido de «${debil.nombre}»: es la capacitación con el desempeño más bajo (${debil.puntaje} pts).`);
    }
    if (dist.bajo > 0) {
      add('acompanamiento', 'info', `Reforzar el acompañamiento: ${dist.bajo} inscripción${dist.bajo === 1 ? '' : 'es'} con rendimiento bajo (menos de 60 pts).`);
    }
    if (fuerte && (!debil || fuerte.capacitacionId !== debil.capacitacionId)) {
      add(`replicar:${fuerte.capacitacionId}`, 'success', `Replicar la metodología de «${fuerte.nombre}» (${fuerte.puntaje} pts) en las capacitaciones más débiles.`);
    }

    return {
      cohorteActual: actual,
      actualizadoEn: new Date().toISOString(),
      metricas: {
        totalInscritos: filas.length,
        tasaParticipacion: participantes.size ? Math.round((conActividad.size / participantes.size) * 100) : 0,
        capacitacionMasDebil: debil ? { id: debil.capacitacionId, nombre: debil.nombre, puntaje: debil.puntaje! } : null,
        capacitacionMasFuerte: fuerte ? { id: fuerte.capacitacionId, nombre: fuerte.nombre, puntaje: fuerte.puntaje! } : null,
      },
      evolucion,
      decisiones,
      distribucion: dist,
    };
  }

  async marcarDecision(empresaId: string, clave: string, aplicada: boolean): Promise<void> {
    await this.repo.marcarDecision(empresaId, clave, aplicada);
  }
}
