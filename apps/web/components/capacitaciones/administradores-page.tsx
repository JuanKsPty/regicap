'use client';

import { crearAdministradorSchema, type CrearAdministradorInput } from '@regicap/types';
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, Input, SectionLabel, Skeleton } from '@regicap/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Consulta, PageHeader, Section } from '@/components/page';
import { useToast } from '@/components/toast';
import { aplicarErroresApi, mensajeDe } from '@/lib/forms';
import { useAdministradores, useAdministradoresMutations } from '@/lib/queries';

/** La Empresa da de alta a los Administradores que consultan resultados y entregan feedback de SUS capacitaciones. */
export function AdministradoresPage() {
  const query = useAdministradores();
  const m = useAdministradoresMutations();
  const { toast } = useToast();
  const [error, setErrorGeneral] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<{ id: string; nombre: string } | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<CrearAdministradorInput>({
    resolver: zodResolver(crearAdministradorSchema),
    defaultValues: { nombre: '', email: '', password: '' },
  });

  const enviar = handleSubmit(async (v) => {
    setErrorGeneral(null);
    try {
      await m.crear.mutateAsync(v);
      toast('Administrador creado.');
      reset();
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['nombre', 'email', 'password']));
    }
  });

  return (
    <>
      <PageHeader title="Administradores" subtitle="Cuentas que consultan resultados y entregan feedback de las capacitaciones de tu organización." />
      <Card className="max-w-xl">
        <SectionLabel className="mb-3">Nuevo administrador</SectionLabel>
        <form onSubmit={enviar} noValidate className="space-y-3.5">
          <Field label="Nombre completo" htmlFor="adm-nombre" error={errors.nombre?.message}>
            <Input id="adm-nombre" aria-invalid={!!errors.nombre} {...register('nombre')} />
          </Field>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Correo electrónico" htmlFor="adm-email" error={errors.email?.message}>
              <Input id="adm-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register('email')} />
            </Field>
            <Field label="Contraseña inicial" htmlFor="adm-pass" error={errors.password?.message} hint="Mínimo 8 caracteres">
              <Input id="adm-pass" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
            </Field>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" loading={m.crear.isPending}>Crear administrador</Button>
        </form>
      </Card>
      <Section title="Administradores de tu organización">
        <Consulta query={query} esqueleto={<Skeleton className="h-24" />}>
          {(lista) =>
            lista.length ? (
              <Card className="p-0">
                <ul>
                  {lista.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">{a.nombre}</div>
                        <div className="truncate text-xs text-fg-2">{a.email}</div>
                      </div>
                      <Button size="sm" variant="danger" aria-label={`Eliminar a ${a.nombre}`} onClick={() => setBorrar(a)}>
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <EmptyState icon={<Users className="size-7" />} title="Aún no tienes administradores" description="Crea uno arriba para que pueda consultar los resultados de tus participantes." />
            )
          }
        </Consulta>
      </Section>
      <ConfirmDialog
        open={!!borrar}
        onOpenChange={(o) => !o && setBorrar(null)}
        title="¿Eliminar este administrador?"
        description={<>Se eliminará la cuenta de <strong className="text-fg">{borrar?.nombre}</strong>. Si ya entregó feedback no podrá eliminarse.</>}
        confirmLabel="Eliminar"
        destructive
        loading={m.eliminar.isPending}
        onConfirm={() => m.eliminar.mutateAsync(borrar!.id).then(() => toast('Administrador eliminado.')).catch((e) => toast(mensajeDe(e), 'error')).finally(() => setBorrar(null))}
      />
    </>
  );
}
