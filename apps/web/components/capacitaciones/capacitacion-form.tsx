'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { capacitacionSchema, type CapacitacionFormValues, type CapacitacionInput } from '@regicap/types';
import { Alert, Button, Card, Field, Input, SectionLabel } from '@regicap/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/toast';
import { aplicarErroresApi } from '@/lib/forms';
import { useRegistrarCapacitacion } from '@/lib/queries';

/**
 * Formulario de CU-11 FA-1: valida primero en el navegador con el esquema zod
 * compartido (FE-1) y repite la validación en la API; el mensaje de FE-2
 * (nombre duplicado) aparece junto al campo SIN borrar lo ingresado.
 */
export function CapacitacionForm() {
  const registrar = useRegistrarCapacitacion();
  const { toast } = useToast();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CapacitacionFormValues, unknown, CapacitacionInput>({ resolver: zodResolver(capacitacionSchema), defaultValues: { nombre: '', duracion: '' } });

  const enviar = handleSubmit(async (v) => {
    setErrorGeneral(null);
    try {
      const c = await registrar.mutateAsync(v);
      toast(`«${c.nombre}» registrada en estado Borrador.`);
      reset();
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['nombre', 'duracion']));
    }
  });

  return (
    <Card className="max-w-xl">
      <SectionLabel className="mb-3">Registrar nueva capacitación</SectionLabel>
      <form onSubmit={enviar} noValidate className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-[1fr_210px]">
          <Field label="Nombre de la capacitación" htmlFor="reg-nombre" error={errors.nombre?.message}>
            <Input id="reg-nombre" placeholder="Ej. Gestión de Inventarios" aria-invalid={!!errors.nombre} {...register('nombre')} />
          </Field>
          <Field label="Duración estimada (semanas)" htmlFor="reg-duracion" error={errors.duracion?.message}>
            <Input id="reg-duracion" type="number" inputMode="numeric" min={1} max={52} step={1} placeholder="Ej. 6" aria-invalid={!!errors.duracion} {...register('duracion')} />
          </Field>
        </div>
        {errorGeneral && <Alert tone="error">{errorGeneral}</Alert>}
        <Button type="submit" loading={registrar.isPending}>
          Registrar capacitación →
        </Button>
      </form>
    </Card>
  );
}
