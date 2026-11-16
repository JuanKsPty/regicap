import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  MAX_PDF_BYTES,
  PDF_MIME,
  youtubeId,
  type ActividadDto,
  type ActividadInput,
  type ActividadPatchInput,
  type ArchivoSolicitudInput,
  type ArchivoSubidaDto,
  type CapacitacionDetalleDto,
  type ModuloEmpresaDto,
  type PreguntaEmpresaDto,
  type PreguntaInput,
} from '@regicap/types';
import { randomUUID } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { AppException, noEncontrado, reglaViolada, solicitudInvalida } from '../common/errors';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.interface';
import { aActividadDto, aPreguntaEmpresaDto, configDePregunta } from './modulos.mappers';
import { ModulosRepository } from './modulos.repository';

const LECTURA_SEGUNDOS = 15 * 60;

/** HTML de las lecturas: lista blanca estricta (el contenido lo ven otros usuarios → XSS). */
export function sanearHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'h2', 'h3', 'div', 'span'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }) },
  }).trim();
}

@Injectable()
export class ModulosService {
  private readonly logger = new Logger(ModulosService.name);

  constructor(
    private readonly repo: ModulosRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /* ─────────── Lectura ─────────── */

  async detalleCapacitacion(empresaId: string, id: string): Promise<CapacitacionDetalleDto> {
    const c = await this.repo.findDetalleScoped(id, empresaId);
    if (!c) throw noEncontrado('No se encontró la capacitación.');
    const heredadas = await this.repo.preguntasDeContenido(id);
    const modulos: ModuloEmpresaDto[] = [];
    for (const m of c.modulos) {
      const actividades: ActividadDto[] = [];
      for (const a of m.actividades) {
        actividades.push(aActividadDto(a, a.archivoKey ? await this.storage.urlDeLectura(a.archivoKey, LECTURA_SEGUNDOS) : null));
      }
      modulos.push({
        id: m.id,
        nombre: m.nombre,
        orden: m.orden,
        tipo: m.tipo,
        actividades,
        preguntas: m.preguntas.map(aPreguntaEmpresaDto),
        pesoTotal: m.preguntas.reduce((a, p) => a + Number(p.peso), 0),
        preguntasHeredadas: m.tipo === 'TEST' ? heredadas : 0,
      });
    }
    return { id: c.id, nombre: c.nombre, duracion: c.duracion, estado: c.estado, creadoEn: c.creadoEn.toISOString(), modulos };
  }

  /* ─────────── Módulos ─────────── */

  async crearModulo(empresaId: string, capacitacionId: string, nombre: string, tipo: 'CONTENIDO' | 'TEST') {
    if (!(await this.repo.findCapacitacionScoped(capacitacionId, empresaId))) throw noEncontrado('No se encontró la capacitación.');
    const m = await this.repo.crearModulo(capacitacionId, nombre, tipo);
    return { id: m.id, nombre: m.nombre, orden: m.orden, tipo: m.tipo };
  }

  async renombrarModulo(empresaId: string, id: string, nombre: string) {
    await this.moduloScoped(id, empresaId);
    const m = await this.repo.renombrarModulo(id, nombre);
    return { id: m.id, nombre: m.nombre, orden: m.orden, tipo: m.tipo };
  }

  async eliminarModulo(empresaId: string, id: string): Promise<void> {
    const m = await this.moduloScoped(id, empresaId);
    // Borrar un módulo borra las respuestas de quienes lo cursan: se bloquea como la capacitación (FE-3).
    if ((await this.repo.inscripcionesActivas(m.capacitacionId)) > 0) {
      throw reglaViolada('TIENE_INSCRITOS', 'No se puede eliminar: hay participantes inscritos.');
    }
    const claves = await this.repo.eliminarModulo(id);
    await this.borrarArchivos(claves);
  }

  async moverModulo(empresaId: string, id: string, direccion: -1 | 1): Promise<void> {
    const m = await this.moduloScoped(id, empresaId);
    await this.repo.moverModulo(id, m.capacitacionId, direccion);
  }

  /* ─────────── Actividades (PDF · lectura · video) ─────────── */

  async solicitarSubida(empresaId: string, dto: ArchivoSolicitudInput): Promise<ArchivoSubidaDto> {
    const clave = `empresas/${empresaId}/${randomUUID()}.pdf`;
    const url = await this.storage.urlDeSubida(clave, PDF_MIME, dto.tamano);
    return { clave, url, maxBytes: MAX_PDF_BYTES };
  }

  async crearActividad(empresaId: string, moduloId: string, dto: ActividadInput): Promise<ActividadDto> {
    const m = await this.moduloScoped(moduloId, empresaId);
    if (m.tipo === 'TEST') {
      throw solicitudInvalida('DATOS_INVALIDOS', 'La evaluación final solo contiene preguntas, no actividades de contenido.');
    }
    let contenido: string | null = null;
    let archivoKey: string | null = null;
    if (dto.tipo === 'PDF') {
      archivoKey = await this.validarPdf(empresaId, dto.archivoKey);
    } else if (dto.tipo === 'TEXTO') {
      contenido = this.textoLimpio(dto.contenido);
    } else {
      contenido = dto.contenido;
    }
    const a = await this.repo.crearActividad({ moduloId, titulo: dto.titulo, tipo: dto.tipo, contenido, archivoKey });
    return aActividadDto(a, a.archivoKey ? await this.storage.urlDeLectura(a.archivoKey, LECTURA_SEGUNDOS) : null);
  }

  async editarActividad(empresaId: string, id: string, dto: ActividadPatchInput): Promise<ActividadDto> {
    const a = await this.repo.findActividadScoped(id, empresaId);
    if (!a) throw noEncontrado('No se encontró la actividad.');
    const data: Record<string, string | null> = {};
    if (dto.titulo !== undefined) data.titulo = dto.titulo;
    let claveVieja: string | null = null;
    if (a.tipo === 'TEXTO' && dto.contenido !== undefined) data.contenido = this.textoLimpio(dto.contenido);
    if (a.tipo === 'VIDEO' && dto.contenido !== undefined) {
      if (!youtubeId(dto.contenido)) {
        throw solicitudInvalida('DATOS_INVALIDOS', 'Ingresa un enlace válido de YouTube.', { contenido: 'Ingresa un enlace válido de YouTube.' });
      }
      data.contenido = dto.contenido;
    }
    if (a.tipo === 'PDF' && dto.archivoKey !== undefined && dto.archivoKey !== a.archivoKey) {
      data.archivoKey = await this.validarPdf(empresaId, dto.archivoKey);
      claveVieja = a.archivoKey;
    }
    const nueva = await this.repo.actualizarActividad(id, data);
    if (claveVieja) await this.borrarArchivos([claveVieja]);
    return aActividadDto(nueva, nueva.archivoKey ? await this.storage.urlDeLectura(nueva.archivoKey, LECTURA_SEGUNDOS) : null);
  }

  async eliminarActividad(empresaId: string, id: string): Promise<void> {
    const a = await this.repo.findActividadScoped(id, empresaId);
    if (!a) throw noEncontrado('No se encontró la actividad.');
    await this.repo.eliminarActividad(id);
    if (a.archivoKey) await this.borrarArchivos([a.archivoKey]);
  }

  /* ─────────── Preguntas del test (pesos que suman 100 %) ─────────── */

  async crearPregunta(empresaId: string, moduloId: string, dto: PreguntaInput): Promise<PreguntaEmpresaDto> {
    await this.moduloScoped(moduloId, empresaId);
    const actual = Number((await this.repo.pesoPreguntas(moduloId))._sum.peso ?? 0);
    if (actual + dto.peso > 100.0001) {
      const libre = Math.max(0, Math.round((100 - actual) * 100) / 100);
      const msg = `La suma de pesos del test no puede superar 100 % (disponible: ${libre} %).`;
      throw new AppException(HttpStatus.CONFLICT, 'PESOS_INVALIDOS', msg, { peso: msg });
    }
    const { configuracion, rubrica } = configDePregunta(dto);
    const p = await this.repo.crearPregunta({
      moduloId,
      texto: dto.texto,
      tipo: dto.tipo,
      peso: dto.peso,
      configuracion: configuracion ?? undefined,
      rubrica,
    });
    return aPreguntaEmpresaDto(p);
  }

  async eliminarPregunta(empresaId: string, id: string): Promise<void> {
    if (!(await this.repo.findPreguntaScoped(id, empresaId))) throw noEncontrado('No se encontró la pregunta.');
    await this.repo.eliminarPregunta(id);
  }

  /* ─────────── Utilidades ─────────── */

  private async moduloScoped(id: string, empresaId: string) {
    const m = await this.repo.findModuloScoped(id, empresaId);
    if (!m) throw noEncontrado('No se encontró el módulo.');
    return m;
  }

  private textoLimpio(html: string): string {
    const limpio = sanearHtml(html);
    const plano = sanitizeHtml(limpio, { allowedTags: [], allowedAttributes: {} }).trim();
    if (!plano) {
      throw solicitudInvalida('CAMPOS_REQUERIDOS', 'Debe completar los campos obligatorios.', {
        contenido: 'Debe completar los campos obligatorios.',
      });
    }
    return limpio;
  }

  /** El PDF debe estar en el prefijo de la Empresa (RNF-03), existir y cumplir tipo y tamaño reales. */
  private async validarPdf(empresaId: string, clave: string): Promise<string> {
    const campos = { archivoKey: 'Adjunta un archivo PDF válido.' };
    if (!clave.startsWith(`empresas/${empresaId}/`)) {
      throw solicitudInvalida('ARCHIVO_INVALIDO', 'El archivo no es válido.', campos);
    }
    const meta = await this.storage.metadatos(clave);
    if (!meta) throw solicitudInvalida('ARCHIVO_INVALIDO', 'No se encontró el archivo subido. Súbelo de nuevo.', campos);
    if (meta.bytes > MAX_PDF_BYTES || meta.tipo !== PDF_MIME) {
      await this.borrarArchivos([clave]);
      throw solicitudInvalida('ARCHIVO_INVALIDO', 'El PDF debe pesar 3 MB o menos.', { archivoKey: 'El PDF debe pesar 3 MB o menos.' });
    }
    return clave;
  }

  private async borrarArchivos(claves: string[]) {
    const r = await Promise.allSettled(claves.map((k) => this.storage.eliminar(k)));
    r.forEach((x, i) => x.status === 'rejected' && this.logger.warn(`No se pudo eliminar ${claves[i]}`));
  }
}
