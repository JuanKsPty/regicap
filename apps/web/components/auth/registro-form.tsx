'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { registroFormSchema, TIPOS_EMPRESA, type RegistroFormInput } from '@regicap/types';
import { Alert, Button, cn, Field, Input, Select } from '@regicap/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { aplicarErroresApi } from '@/lib/forms';
import { useRegistro } from '@/lib/queries';
import { HOME_POR_ROL } from './home';

const ETIQUETA_TIPO: Record<string, string> = { cámara: 'Cámara de comercio', banco: 'Banco', plataforma: 'Plataforma', universidad: 'Universidad', gobierno: 'Gobierno', otro: 'Otro' };

export function RegistroForm() {
  const router = useRouter();
  const registro = useRegistro();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError: setCampo,
    formState: { errors },
  } = useForm<RegistroFormInput>({
    resolver: zodResolver(registroFormSchema),
    defaultValues: { rol: 'PARTICIPANTE', nombre: '', email: '', password: '', confirmar: '', empresaNombre: '', empresaTipo: 'otro' },
  });
  const rol = watch('rol');

  const enviar = handleSubmit(async ({ confirmar: _c, ...v }) => {
    setError(null);
    try {
      const u = await registro.mutateAsync({ ...v, ...(v.rol === 'PARTICIPANTE' ? { empresaNombre: undefined, empresaTipo: undefined } : {}) });
      router.replace(HOME_POR_ROL[u.rol]);
      router.refresh();
    } catch (e) {
      setError(aplicarErroresApi(e, setCampo, ['nombre', 'email', 'password', 'empresaNombre']));
    }
  });

  return (
    <div className="rise rounded-xl border border-border bg-card p-6 shadow-pop sm:p-8">
      <h1 className="text-xl font-bold text-fg">Crear cuenta</h1>
      <p className="mt-1 text-[13px] text-fg-2">Regístrate según tu rol en la plataforma.</p>

      <form onSubmit={enviar} noValidate className="mt-6 space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-fg">Tipo de cuenta</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de cuenta">
            {([['PARTICIPANTE', 'Participante', 'Tomo capacitaciones'], ['EMPRESA', 'Empresa', 'Ofrezco capacitaciones']] as const).map(([valor, titulo, ayuda]) => (
              <label
                key={valor}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary',
                  rol === valor ? 'border-primary bg-primary-light' : 'border-border hover:bg-bg-2',
                )}
              >
                <input type="radio" value={valor} className="sr-only" {...register('rol')} />
                <span className={cn('block text-[13px] font-bold', rol === valor ? 'text-primary' : 'text-fg')}>{titulo}</span>
                <span className="block text-[11px] text-fg-2">{ayuda}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Nombre completo" htmlFor="nombre" error={errors.nombre?.message}>
          <Input id="nombre" autoComplete="name" placeholder="Ej. Ana Torres" aria-invalid={!!errors.nombre} {...register('nombre')} />
        </Field>

        {rol === 'EMPRESA' && (
          <>
            <Field label="Nombre de la empresa" htmlFor="empresaNombre" error={errors.empresaNombre?.message}>
              <Input id="empresaNombre" placeholder="Ej. Cámara de Comercio" aria-invalid={!!errors.empresaNombre} {...register('empresaNombre')} />
            </Field>
            <Field label="Tipo de organización" htmlFor="empresaTipo">
              <Select id="empresaTipo" {...register('empresaTipo')}>
                {TIPOS_EMPRESA.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_TIPO[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="correo@ejemplo.com" aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contraseña" htmlFor="password" error={errors.password?.message} hint="Mínimo 8 caracteres">
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
          </Field>
          <Field label="Confirmar contraseña" htmlFor="confirmar" error={errors.confirmar?.message}>
            <Input id="confirmar" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmar} {...register('confirmar')} />
          </Field>
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" full loading={registro.isPending} onClick={() => setValue('rol', rol)}>
          Crear cuenta
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-fg-2">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
