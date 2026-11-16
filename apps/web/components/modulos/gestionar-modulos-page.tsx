'use client';

import { capacitacionSchema, type CapacitacionInput } from '@regicap/types';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogTitle, EmptyState, Field, Input, Skeleton } from '@regicap/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, Pencil, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EstadoBadge } from '@/components/capacitaciones/estado-badge';
import { Consulta, PageHeader } from '@/components/page';
import { useToast } from '@/components/toast';
import { aplicarErroresApi, mensajeDe } from '@/lib/forms';
import { useCambiarEstadoCapacitacion, useCapacitacionDetalle, useEditarCapacitacion, useModulosMutations } from '@/lib/queries';
import { ModuloCard } from './modulo-card';

function EditarDatosDialog({ id, inicial, abierto, onClose }: { id: string; inicial: CapacitacionInput; abierto: boolean; onClose: () => void }) {
  const editar = useEditarCapacitacion(id);
  const { toast } = useToast();
  const [error, setErrorGeneral] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<CapacitacionInput>({ resolver: zodResolver(capacitacionSchema), defaultValues: inicial });
  const enviar = handleSubmit(async (v) => {
    setErrorGeneral(null);
    try {
      await editar.mutateAsync(v);
      toast('Datos actualizados.');
      onClose();
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['nombre', 'duracion']));
    }
  });
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Editar capacitación</DialogTitle>
        <DialogDescription>Cambia el nombre o la duración estimada.</DialogDescription>
        <form onSubmit={enviar} noValidate className="mt-4 space-y-3.5">
          <Field label="Nombre" htmlFor="ed-nombre" error={errors.nombre?.message}>
            <Input id="ed-nombre" aria-invalid={!!errors.nombre} {...register('nombre')} />
          </Field>
          <Field label="Duración estimada" htmlFor="ed-duracion" error={errors.duracion?.message}>
            <Input id="ed-duracion" aria-invalid={!!errors.duracion} {...register('duracion')} />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={editar.isPending}>Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** CU-12 Gestionar módulos: se llega con «Editar» desde CU-11. */
export function GestionarModulosPage({ id }: { id: string }) {
  const query = useCapacitacionDetalle(id);
  const m = useModulosMutations(id);
  const estado = useCambiarEstadoCapacitacion();
  const { toast } = useToast();
  const [nombre, setNombre] = useState('');
  const [errorNombre, setErrorNombre] = useState<string>();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [editarDatos, setEditarDatos] = useState(false);

  async function agregar(tipo: 'CONTENIDO' | 'TEST') {
    const n = nombre.trim() || (tipo === 'TEST' ? 'Evaluación final' : '');
    if (!n) return setErrorNombre('Debe completar los campos obligatorios.');
    setErrorNombre(undefined);
    try {
      const nuevo = await m.crear.mutateAsync({ nombre: n, tipo });
      setNombre('');
      setAbierto(nuevo.id);
      toast(tipo === 'TEST' ? 'Evaluación final creada.' : 'Módulo creado.');
    } catch (e) {
      setErrorNombre(mensajeDe(e));
    }
  }

  return (
    <Consulta query={query} esqueleto={<Skeleton className="h-64" />}>
      {(c) => {
        const tieneTest = c.modulos.some((x) => x.tipo === 'TEST');
        return (
          <>
            <PageHeader
              back={{ href: '/empresa/capacitaciones', label: 'Volver a Mis capacitaciones' }}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {c.nombre} <EstadoBadge estado={c.estado} />
                </span>
              }
              subtitle={`Duración: ${c.duracion}`}
              actions={
                <>
                  <Button size="sm" variant="secondary" onClick={() => setEditarDatos(true)}>
                    <Pencil className="size-3.5" aria-hidden /> Editar datos
                  </Button>
                  {c.estado === 'PUBLICADA' ? (
                    <Button size="sm" variant="secondary" loading={estado.isPending} onClick={() => estado.mutateAsync({ id, accion: 'despublicar' }).then(() => toast('Volvió a Borrador.')).catch((e) => toast(mensajeDe(e), 'error'))}>
                      Despublicar
                    </Button>
                  ) : (
                    <Button size="sm" loading={estado.isPending} onClick={() => estado.mutateAsync({ id, accion: 'publicar' }).then(() => toast('Publicada: ya aparece en el catálogo.')).catch((e) => toast(mensajeDe(e), 'error'))}>
                      Publicar
                    </Button>
                  )}
                </>
              }
            />

            <div className="flex max-w-3xl flex-wrap gap-2">
              <div className="min-w-[220px] flex-1">
                <Field error={errorNombre}>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar('CONTENIDO')} placeholder="Nombre del nuevo módulo de contenido" aria-label="Nombre del nuevo módulo" aria-invalid={!!errorNombre} />
                </Field>
              </div>
              <Button onClick={() => agregar('CONTENIDO')} loading={m.crear.isPending} className="self-start">
                <Plus className="size-4" aria-hidden /> Módulo
              </Button>
              {!tieneTest && (
                <Button variant="secondary" className="self-start" onClick={() => agregar('TEST')} loading={m.crear.isPending}>
                  <Target className="size-4" aria-hidden /> Evaluación final
                </Button>
              )}
            </div>
            <p className="mb-5 mt-2 text-xs text-fg-2">Cada módulo puede tener actividades (PDF, lectura o video) y un test cuyos pesos sumen 100 %. La evaluación final reúne los tests de todos los módulos.</p>

            {c.modulos.length ? (
              c.modulos.map((mod, i) => (
                <ModuloCard
                  key={mod.id}
                  capacitacionId={id}
                  modulo={mod}
                  primero={i === 0}
                  ultimo={i === c.modulos.length - 1}
                  expandido={abierto === mod.id}
                  onToggle={() => setAbierto(abierto === mod.id ? null : mod.id)}
                />
              ))
            ) : (
              <EmptyState icon={<Layers className="size-7" />} title="Esta capacitación aún no tiene módulos" description="Crea el primero con el campo de arriba." />
            )}

            {editarDatos && <EditarDatosDialog id={id} inicial={{ nombre: c.nombre, duracion: c.duracion }} abierto onClose={() => setEditarDatos(false)} />}
          </>
        );
      }}
    </Consulta>
  );
}
