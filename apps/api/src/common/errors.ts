import { HttpException, HttpStatus } from '@nestjs/common';
import type { CodigoError } from '@regicap/types';

/** Excepción de negocio con el formato uniforme { codigo, mensaje, campos }. */
export class AppException extends HttpException {
  constructor(status: number, codigo: CodigoError, mensaje: string, campos: Record<string, string> = {}) {
    super({ codigo, mensaje, campos }, status);
  }
}

export const noEncontrado = (mensaje = 'No se encontró el recurso solicitado.') =>
  new AppException(HttpStatus.NOT_FOUND, 'NO_ENCONTRADO', mensaje);

export const reglaViolada = (codigo: CodigoError, mensaje: string, campos: Record<string, string> = {}) =>
  new AppException(HttpStatus.CONFLICT, codigo, mensaje, campos);

export const solicitudInvalida = (codigo: CodigoError, mensaje: string, campos: Record<string, string> = {}) =>
  new AppException(HttpStatus.BAD_REQUEST, codigo, mensaje, campos);
