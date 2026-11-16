import { Injectable } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RespuestasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Módulo de la capacitación con su contenido (actividades y preguntas propias). */
  findModulo(moduloId: string, capacitacionId: string) {
    return this.prisma.modulo.findFirst({
      where: { id: moduloId, capacitacionId },
      include: {
        actividades: { orderBy: { orden: 'asc' } },
        preguntas: { orderBy: { creadaEn: 'asc' } },
      },
    });
  }

  /** Módulos de contenido con sus preguntas (las hereda el módulo TEST). */
  modulosDeContenidoConPreguntas(capacitacionId: string) {
    return this.prisma.modulo.findMany({
      where: { capacitacionId, tipo: 'CONTENIDO' },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, orden: true, preguntas: { orderBy: { creadaEn: 'asc' } } },
    });
  }

  findRespuesta(inscripcionId: string, moduloId: string) {
    return this.prisma.respuesta.findUnique({
      where: { inscripcionId_moduloId: { inscripcionId, moduloId } },
      include: { calificacion: true },
    });
  }

  /** Guarda el borrador (crea o actualiza); no toca respuestas ya enviadas. */
  guardarBorrador(inscripcionId: string, moduloId: string, contenido: Prisma.InputJsonValue) {
    return this.prisma.respuesta.upsert({
      where: { inscripcionId_moduloId: { inscripcionId, moduloId } },
      create: { inscripcionId, moduloId, contenido, estado: 'BORRADOR' },
      update: { contenido },
      include: { calificacion: true },
    });
  }

  /**
   * Persistir ANTES de procesar (RNF-09): en UNA transacción se guarda la
   * Respuesta como ENVIADA y su Calificación como PENDIENTE y se actualiza el
   * estado de la inscripción. Recién después se encola el trabajo.
   */
  enviarEnTransaccion(
    inscripcionId: string,
    moduloId: string,
    contenido: Prisma.InputJsonValue,
    despues: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existente = await tx.respuesta.findUnique({ where: { inscripcionId_moduloId: { inscripcionId, moduloId } } });
      if (existente?.estado === 'ENVIADA') return { yaEnviada: true as const };
      const respuesta = existente
        ? await tx.respuesta.update({ where: { id: existente.id }, data: { contenido, estado: 'ENVIADA', fechaEnvio: new Date() } })
        : await tx.respuesta.create({ data: { inscripcionId, moduloId, contenido, estado: 'ENVIADA', fechaEnvio: new Date() } });
      await tx.calificacion.upsert({
        where: { respuestaId: respuesta.id },
        create: { respuestaId: respuesta.id, estado: 'PENDIENTE' },
        update: { estado: 'PENDIENTE', puntaje: null, nivel: null, criterioMasBajo: null, intentos: 0, ultimoError: null, detalle: Prisma.DbNull },
      });
      await despues(tx);
      return { yaEnviada: false as const, respuestaId: respuesta.id };
    });
  }
}
