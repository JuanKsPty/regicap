import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import { formatearDuracion, type CapacitacionDto, type CapacitacionInput, type CapacitacionPatchInput } from '@regicap/types';
import { AppException, noEncontrado, reglaViolada } from '../common/errors';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.interface';
import { Capacitacion } from './capacitacion.entity';
import { CapacitacionesRepository } from './capacitaciones.repository';

type Fila = Awaited<ReturnType<CapacitacionesRepository['create']>>;

export function aCapacitacionDto(c: Fila): CapacitacionDto {
  return {
    id: c.id,
    nombre: c.nombre,
    duracion: c.duracion,
    estado: c.estado,
    modulos: c._count.modulos,
    creadoEn: c.creadoEn.toISOString(),
  };
}

const MSG_NOMBRE_DUPLICADO = 'Ya tienes una capacitación con ese nombre.';

@Injectable()
export class CapacitacionesService {
  private readonly logger = new Logger(CapacitacionesService.name);

  constructor(
    private readonly repo: CapacitacionesRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** CU-11 2.1.2 — listado de la Empresa. */
  async listarDeEmpresa(empresaId: string): Promise<CapacitacionDto[]> {
    return (await this.repo.findByEmpresa(empresaId)).map(aCapacitacionDto);
  }

  /** CU-11 FA-1: toda capacitación nace en BORRADOR (se ignora cualquier estado recibido). */
  async registrar(empresaId: string, dto: CapacitacionInput): Promise<CapacitacionDto> {
    await this.exigirNombreLibre(empresaId, dto.nombre);
    try {
      const c = await this.repo.create({ empresaId, nombre: dto.nombre, duracion: formatearDuracion(dto.duracion), estado: Capacitacion.estadoInicial });
      return aCapacitacionDto(c);
    } catch (e) {
      this.traducirDuplicado(e);
    }
  }

  async editar(empresaId: string, id: string, dto: CapacitacionPatchInput): Promise<CapacitacionDto> {
    await this.obtenerScoped(id, empresaId);
    if (dto.nombre) await this.exigirNombreLibre(empresaId, dto.nombre, id);
    try {
      return aCapacitacionDto(await this.repo.update(id, { nombre: dto.nombre, duracion: dto.duracion === undefined ? undefined : formatearDuracion(dto.duracion) }));
    } catch (e) {
      this.traducirDuplicado(e);
    }
  }

  /** CU-11 FA-2. */
  async publicar(empresaId: string, id: string): Promise<CapacitacionDto> {
    const c = await this.obtenerScoped(id, empresaId);
    // RF-06: el test de cada módulo debe sumar 100 % antes de entrar al catálogo.
    const invalidos = (await this.repo.pesosPorModulo(id)).filter((m) => Math.abs(m.peso - 100) > 0.01);
    if (invalidos.length) {
      const lista = invalidos.map((m) => `«${m.nombre}» (${m.peso} %)`).join(', ');
      throw new AppException(
        HttpStatus.CONFLICT,
        'PUBLICACION_INVALIDA',
        `Antes de publicar, los pesos del test deben sumar 100 %: ${lista}.`,
      );
    }
    const entidad = new Capacitacion(c.estado);
    return aCapacitacionDto(await this.repo.update(id, { estado: entidad.publicar() }));
  }

  /** CU-11 FA-3: despublicar devuelve la capacitación a BORRADOR. */
  async despublicar(empresaId: string, id: string): Promise<CapacitacionDto> {
    const c = await this.obtenerScoped(id, empresaId);
    const entidad = new Capacitacion(c.estado);
    return aCapacitacionDto(await this.repo.update(id, { estado: entidad.despublicar() }));
  }

  /** CU-11 FA-4 / FE-3 — verifica inscripciones activas y borra en una sola transacción. */
  async eliminar(empresaId: string, id: string): Promise<void> {
    await this.obtenerScoped(id, empresaId);
    const r = await this.repo.eliminarSiSinInscritos(id);
    if (!r.eliminado) {
      throw reglaViolada('TIENE_INSCRITOS', 'No se puede eliminar: hay participantes inscritos.');
    }
    // Limpieza (mejor esfuerzo) de los PDF; la BD ya quedó consistente.
    await Promise.allSettled(r.claves.map((k) => this.storage.eliminar(k))).then((res) =>
      res.forEach((x, i) => x.status === 'rejected' && this.logger.warn(`No se pudo eliminar ${r.claves[i]}`)),
    );
  }

  /** Toda búsqueda por id incluye el empresaId del token; si no coincide → 404 (EC-02). */
  async obtenerScoped(id: string, empresaId: string) {
    const c = await this.repo.findOneScoped(id, empresaId);
    if (!c) throw noEncontrado('No se encontró la capacitación.');
    return c;
  }

  private async exigirNombreLibre(empresaId: string, nombre: string, excluirId?: string) {
    if (await this.repo.existsNombre(empresaId, nombre, excluirId)) {
      throw reglaViolada('NOMBRE_DUPLICADO', MSG_NOMBRE_DUPLICADO, { nombre: MSG_NOMBRE_DUPLICADO });
    }
  }

  /** UNIQUE(empresa_id, nombre) ante concurrencia → 409 NOMBRE_DUPLICADO. */
  private traducirDuplicado(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw reglaViolada('NOMBRE_DUPLICADO', MSG_NOMBRE_DUPLICADO, { nombre: MSG_NOMBRE_DUPLICADO });
    }
    throw e;
  }
}
