import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@regicap/db';
import type { ErrorApi } from '@regicap/types';
import type { Response } from 'express';

const POR_ESTADO: Record<number, { codigo: string; mensaje: string }> = {
  400: { codigo: 'DATOS_INVALIDOS', mensaje: 'La solicitud no es válida.' },
  401: { codigo: 'NO_AUTENTICADO', mensaje: 'Inicia sesión para continuar.' },
  403: { codigo: 'ROL_NO_PERMITIDO', mensaje: 'No tienes permiso para realizar esta acción.' },
  404: { codigo: 'NO_ENCONTRADO', mensaje: 'No se encontró el recurso solicitado.' },
  429: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' },
};

/**
 * Filtro global de excepciones (RNF-07): TODA respuesta de error de la API usa
 * el formato { codigo, mensaje, campos }.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, cuerpo } = this.traducir(exception);
    if (status >= 500) this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    res.status(status).json(cuerpo);
  }

  private traducir(exception: unknown): { status: number; cuerpo: ErrorApi } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'codigo' in body && 'mensaje' in body) {
        const b = body as Partial<ErrorApi>;
        return { status, cuerpo: { codigo: String(b.codigo), mensaje: String(b.mensaje), campos: b.campos ?? {} } };
      }
      const base = POR_ESTADO[status] ?? { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado.' };
      return { status, cuerpo: { ...base, campos: {} } };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') return { status: 404, cuerpo: { ...POR_ESTADO[404]!, campos: {} } } as never;
      if (exception.code === 'P2002') {
        return { status: 409, cuerpo: { codigo: 'DATOS_INVALIDOS', mensaje: 'Ya existe un registro con esos datos.', campos: {} } };
      }
      if (exception.code === 'P2003') {
        return { status: 409, cuerpo: { codigo: 'DATOS_INVALIDOS', mensaje: 'La operación viola una relación de datos.', campos: {} } };
      }
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      cuerpo: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado. Inténtalo de nuevo.', campos: {} },
    };
  }
}
