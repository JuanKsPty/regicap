import { z } from 'zod';
import { MSG_CAMPOS_OBLIGATORIOS } from './errores';
import { TIPOS_EMPRESA, type Rol } from './enums';

const obligatorio = (max: number) =>
  z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).trim().min(1, MSG_CAMPOS_OBLIGATORIOS).max(max, `Máximo ${max} caracteres.`);

const email = z
  .string({ error: MSG_CAMPOS_OBLIGATORIOS })
  .trim()
  .toLowerCase()
  .min(1, MSG_CAMPOS_OBLIGATORIOS)
  .max(160, 'Máximo 160 caracteres.')
  .pipe(z.email('Ingresa un correo válido.'));

export const MIN_PASSWORD = 8;

export const loginSchema = z.object({
  email,
  password: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).min(1, MSG_CAMPOS_OBLIGATORIOS),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Registro (CU-02). El Participante se crea solo; la Empresa crea además su
 * organización (nombre + tipo). Los Administradores los crea una Empresa desde
 * su portal (quedan ligados a esa Empresa).
 */
const registroBase = z.object({
  rol: z.enum(['PARTICIPANTE', 'EMPRESA'], { error: 'Elige un tipo de cuenta.' }),
  nombre: obligatorio(120),
  email,
  password: z
    .string({ error: MSG_CAMPOS_OBLIGATORIOS })
    .min(MIN_PASSWORD, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
    .max(72, 'Máximo 72 caracteres.'),
  empresaNombre: z.string().trim().max(120, 'Máximo 120 caracteres.').optional(),
  empresaTipo: z.enum(TIPOS_EMPRESA).optional(),
});

type CamposRegistro = z.infer<typeof registroBase>;
const exigeEmpresa = (v: CamposRegistro, ctx: z.RefinementCtx) => {
  if (v.rol === 'EMPRESA' && !v.empresaNombre) {
    ctx.addIssue({ code: 'custom', path: ['empresaNombre'], message: MSG_CAMPOS_OBLIGATORIOS });
  }
};

export const registroSchema = registroBase.superRefine(exigeEmpresa);
/** Mismo esquema + confirmación de contraseña (solo formulario web). */
export const registroFormSchema = registroBase.extend({ confirmar: z.string({ error: MSG_CAMPOS_OBLIGATORIOS }).min(1, MSG_CAMPOS_OBLIGATORIOS) }).superRefine((v, ctx) => {
  exigeEmpresa(v, ctx);
  if (v.confirmar !== v.password) ctx.addIssue({ code: 'custom', path: ['confirmar'], message: 'Las contraseñas no coinciden.' });
});
export type RegistroFormInput = z.infer<typeof registroFormSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;

/** Una Empresa da de alta a un Administrador de su organización. */
export const crearAdministradorSchema = z.object({
  nombre: obligatorio(120),
  email,
  password: z
    .string({ error: MSG_CAMPOS_OBLIGATORIOS })
    .min(MIN_PASSWORD, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
    .max(72, 'Máximo 72 caracteres.'),
});
export type CrearAdministradorInput = z.infer<typeof crearAdministradorSchema>;

export interface UsuarioDto {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  empresaId: string | null;
  empresaNombre: string | null;
}

export interface AdministradorDto {
  id: string;
  nombre: string;
  email: string;
}
