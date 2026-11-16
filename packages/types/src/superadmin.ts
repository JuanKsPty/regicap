import { z } from 'zod';
import { MSG_CAMPOS_OBLIGATORIOS } from './errores';
import { emailSchema, passwordSchema, textoObligatorio } from './auth';
import { ROLES, TIPOS_EMPRESA, type Rol } from './enums';

/**
 * Gestión de cuentas (rol SUPERADMIN): crea usuarios de cualquier rol, cambia
 * contraseñas, desactiva y elimina cuentas. No accede a resultados ni a respuestas.
 */
const baseCrear = z.object({
  rol: z.enum(ROLES, { error: 'Elige un rol.' }),
  nombre: textoObligatorio(120),
  email: emailSchema,
  password: passwordSchema,
  /** Empresa existente (obligatoria para ADMINISTRADOR; opcional para EMPRESA). */
  empresaId: z.string().uuid('Elige una empresa válida.').optional(),
  /** Alta de una Empresa nueva junto con su primera cuenta (rol EMPRESA). */
  empresaNombre: z.string().trim().max(120, 'Máximo 120 caracteres.').optional(),
  empresaTipo: z.enum(TIPOS_EMPRESA).optional(),
});

export const crearUsuarioSchema = baseCrear.superRefine((v, ctx) => {
  if (v.rol === 'ADMINISTRADOR' && !v.empresaId) {
    ctx.addIssue({ code: 'custom', path: ['empresaId'], message: 'Elige la empresa del administrador.' });
  }
  if (v.rol === 'EMPRESA' && !v.empresaId && !v.empresaNombre) {
    ctx.addIssue({ code: 'custom', path: ['empresaNombre'], message: MSG_CAMPOS_OBLIGATORIOS });
  }
});
export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;

export const actualizarUsuarioSchema = z
  .object({ nombre: textoObligatorio(120).optional(), activo: z.boolean().optional() })
  .refine((v) => v.nombre !== undefined || v.activo !== undefined, { message: MSG_CAMPOS_OBLIGATORIOS });
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;

export const cambiarPasswordSchema = z.object({ password: passwordSchema });
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;

export const filtroUsuariosSchema = z.object({
  q: z.string().trim().max(80).optional(),
  rol: z.enum(ROLES).optional(),
});
export type FiltroUsuarios = z.infer<typeof filtroUsuariosSchema>;

export interface UsuarioGestionDto {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  empresaId: string | null;
  empresaNombre: string | null;
  creadoEn: string;
}

export interface EmpresaGestionDto {
  id: string;
  nombre: string;
  tipo: string;
  creadoEn: string;
  usuarios: number;
  capacitaciones: number;
}
