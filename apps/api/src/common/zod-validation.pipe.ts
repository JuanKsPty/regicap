import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { MSG_CAMPOS_OBLIGATORIOS } from '@regicap/types';
import type { ZodType } from 'zod';
import { AppException } from './errors';

/**
 * ValidationPipe basado en los MISMOS esquemas zod que usa el formulario web
 * (packages/types): mismas reglas y mismos mensajes en ambos lados (RNF-07).
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const r = this.schema.safeParse(value ?? {});
    if (r.success) return r.data;

    const campos: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const clave = issue.path.length ? issue.path.join('.') : '_';
      if (!(clave in campos)) campos[clave] = issue.message;
    }
    const mensajes = Object.values(campos);
    const faltan = mensajes.includes(MSG_CAMPOS_OBLIGATORIOS);
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      faltan ? 'CAMPOS_REQUERIDOS' : 'DATOS_INVALIDOS',
      faltan ? MSG_CAMPOS_OBLIGATORIOS : (mensajes[0] ?? 'Datos inválidos.'),
      campos,
    );
  }
}

export const zod = <T>(schema: ZodType<T>) => new ZodValidationPipe(schema);
