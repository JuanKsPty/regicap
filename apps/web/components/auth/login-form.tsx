'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@regicap/types';
import { Alert, Button, Field, Input } from '@regicap/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { aplicarErroresApi } from '@/lib/forms';
import { useLogin } from '@/lib/queries';
import { destinoSeguro } from './home';

const DEMO = [
  { rol: 'Participante', email: 'luis.perez@correo.com', color: 'bg-rol-participante' },
  { rol: 'Empresa', email: 'contacto@camaracomercio.org', color: 'bg-rol-empresa' },
  { rol: 'Administrador', email: 'diego.ramirez@regicap.edu', color: 'bg-rol-admin' },
];

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const login = useLogin();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    setError: setCampo,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const enviar = handleSubmit(async (v) => {
    setError(null);
    try {
      const u = await login.mutateAsync(v);
      router.replace(destinoSeguro(next, u.rol));
      router.refresh();
    } catch (e) {
      // El formulario conserva lo ingresado; el mensaje se muestra sin limpiar nada (EC-07)
      setError(aplicarErroresApi(e, setCampo, ['email', 'password']));
    }
  });

  return (
    <div className="rise rounded-xl border border-border bg-card p-6 shadow-pop sm:p-8">
      <h1 className="text-xl font-bold text-fg">Iniciar sesión</h1>
      <p className="mt-1 text-[13px] text-fg-2">Accede con tu cuenta; te llevaremos a tu portal según tu rol.</p>

      <form onSubmit={enviar} noValidate className="mt-6 space-y-4">
        <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" full loading={login.isPending}>
          Ingresar al sistema
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-fg-2">
        ¿Aún no tienes cuenta?{' '}
        <Link href="/registro" className="font-semibold text-primary hover:underline">
          Crear una cuenta
        </Link>
      </p>

      <div className="mt-6 border-t border-border-subtle pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">Cuentas de demostración</p>
        <p className="mt-1 text-xs text-fg-2">
          Contraseña: <code className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">Regicap2026!</code>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setValue('email', d.email, { shouldValidate: true });
                setValue('password', 'Regicap2026!', { shouldValidate: true });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-fg hover:bg-bg-2"
            >
              <span aria-hidden className={`size-2 rounded-full ${d.color}`} />
              {d.rol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
