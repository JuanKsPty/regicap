'use client';

import type { Rol, UsuarioGestionDto } from '@regicap/types';
import { Alert, Badge, Button, Card, ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogTitle, EmptyState, Field, Input, Select, Skeleton } from '@regicap/ui';
import { KeyRound, Plus, Power, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Consulta, PageHeader } from '@/components/page';
import { useToast } from '@/components/toast';
import { ApiError } from '@/lib/api-client';
import { mensajeDe } from '@/lib/forms';
import { useMe, useUsuariosGestion, useUsuariosMutations } from '@/lib/queries';
import { CrearUsuarioDialog, ETIQUETA_ROL, generarPassword } from './crear-usuario-dialog';

const TONO_ROL: Record<Rol, 'curso' | 'alto' | 'medio' | 'neutral'> = { PARTICIPANTE: 'alto', EMPRESA: 'medio', ADMINISTRADOR: 'curso', SUPERADMIN: 'neutral' };

function CambiarPasswordDialog({ usuario, onClose }: { usuario: UsuarioGestionDto | null; onClose: () => void }) {
  const { password: mutacion } = useUsuariosMutations();
  const { toast } = useToast();
  const [valor, setValor] = useState('');
  const [error, setError] = useState<string>();

  async function guardar() {
    setError(undefined);
    try {
      await mutacion.mutateAsync({ id: usuario!.id, password: valor });
      toast(`Contraseña actualizada para ${usuario!.nombre}.`);
      setValor('');
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? (e.campos.password ?? e.message) : mensajeDe(e));
    }
  }

  return (
    <Dialog open={!!usuario} onOpenChange={(o) => { if (!o) { setValor(''); setError(undefined); onClose(); } }}>
      <DialogContent>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogDescription>Define una contraseña nueva para <strong className="text-fg">{usuario?.nombre}</strong> ({usuario?.email}). Entrégasela por un canal seguro.</DialogDescription>
        <div className="mt-4 space-y-3.5">
          <Field label="Contraseña nueva" error={error} hint="Mínimo 8 caracteres">
            <div className="flex gap-2">
              <Input value={valor} onChange={(e) => setValor(e.target.value)} autoComplete="new-password" aria-invalid={!!error} />
              <Button variant="secondary" onClick={() => setValor(generarPassword())}>Generar</Button>
            </div>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} loading={mutacion.isPending} disabled={!valor}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilaUsuario({ u, esYo, onPassword, onEliminar }: { u: UsuarioGestionDto; esYo: boolean; onPassword: () => void; onEliminar: () => void }) {
  const { actualizar } = useUsuariosMutations();
  const { toast } = useToast();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle px-4 py-3 last:border-0">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-bg-2 text-[13px] font-bold text-fg-2">{u.nombre.charAt(0).toUpperCase()}</span>
      <div className="min-w-[10rem] flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold">{u.nombre}</span>
          {esYo && <Badge tone="neutral">Tú</Badge>}
        </div>
        <div className="truncate text-xs text-fg-2">{u.email}{u.empresaNombre ? ` · ${u.empresaNombre}` : ''}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={TONO_ROL[u.rol]}>{ETIQUETA_ROL[u.rol]}</Badge>
        {!u.activo && <Badge tone="bajo">Desactivada</Badge>}
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="secondary" aria-label={`Cambiar contraseña de ${u.nombre}`} onClick={onPassword}>
          <KeyRound className="size-3.5" aria-hidden /> <span className="hidden sm:inline">Contraseña</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={esYo || actualizar.isPending}
          aria-label={`${u.activo ? 'Desactivar' : 'Activar'} a ${u.nombre}`}
          onClick={() => actualizar.mutateAsync({ id: u.id, activo: !u.activo }).then(() => toast(u.activo ? `${u.nombre} fue desactivado.` : `${u.nombre} fue activado.`)).catch((e) => toast(mensajeDe(e), 'error'))}
        >
          <Power className="size-3.5" aria-hidden /> <span className="hidden sm:inline">{u.activo ? 'Desactivar' : 'Activar'}</span>
        </Button>
        <Button size="sm" variant="danger" disabled={esYo} aria-label={`Eliminar a ${u.nombre}`} onClick={onEliminar}>
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

/** Gestión de cuentas (Superadministrador): crear, cambiar contraseña, desactivar y eliminar. */
export function UsuariosPage() {
  const [q, setQ] = useState('');
  const [rol, setRol] = useState<Rol | ''>('');
  const query = useUsuariosGestion({ ...(q ? { q } : {}), ...(rol ? { rol } : {}) });
  const { eliminar } = useUsuariosMutations();
  const { data: me } = useMe();
  const { toast } = useToast();
  const [crear, setCrear] = useState(false);
  const [pass, setPass] = useState<UsuarioGestionDto | null>(null);
  const [borrar, setBorrar] = useState<UsuarioGestionDto | null>(null);

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas de toda la plataforma. Aquí solo administras cuentas: no ves capacitaciones ni resultados de las empresas."
        actions={<Button onClick={() => setCrear(true)}><Plus className="size-4" aria-hidden /> Nuevo usuario</Button>}
      />
      <Card className="mb-3 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, correo o empresa…" className="pl-9" aria-label="Buscar usuarios" />
        </div>
        <Select value={rol} onChange={(e) => setRol(e.target.value as Rol | '')} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          {(Object.keys(ETIQUETA_ROL) as Rol[]).map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
        </Select>
      </Card>
      <Consulta query={query} esqueleto={<Skeleton className="h-64" />}>
        {(lista) =>
          lista.length ? (
            <Card className="p-0">
              <div className="border-b border-border bg-bg-2/60 px-4 py-2 text-[11px] text-fg-2">{lista.length} cuenta{lista.length === 1 ? '' : 's'}</div>
              <ul>
                {lista.map((u) => (
                  <FilaUsuario key={u.id} u={u} esYo={u.id === me?.id} onPassword={() => setPass(u)} onEliminar={() => setBorrar(u)} />
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState icon={<Users className="size-7" />} title="Ninguna cuenta coincide" description="Prueba con otra búsqueda o limpia el filtro de rol." />
          )
        }
      </Consulta>

      <CrearUsuarioDialog abierto={crear} onClose={() => setCrear(false)} />
      <CambiarPasswordDialog usuario={pass} onClose={() => setPass(null)} />
      <ConfirmDialog
        open={!!borrar}
        onOpenChange={(o) => !o && setBorrar(null)}
        title="¿Eliminar esta cuenta?"
        description={
          <>
            Se eliminará <strong className="text-fg">{borrar?.nombre}</strong> ({borrar?.email}).
            {borrar?.rol === 'PARTICIPANTE' && ' También se borrarán sus inscripciones, respuestas, calificaciones y el feedback que recibió.'}
            {borrar?.rol === 'ADMINISTRADOR' && ' Si ya entregó feedback no podrá eliminarse; desactívalo en su lugar.'} Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar cuenta"
        destructive
        loading={eliminar.isPending}
        onConfirm={() => eliminar.mutateAsync(borrar!.id).then(() => toast('Cuenta eliminada.')).catch((e) => toast(mensajeDe(e), 'error')).finally(() => setBorrar(null))}
      />
      <Alert tone="info" className="mt-4">Una cuenta desactivada no puede iniciar sesión y sus sesiones abiertas se cierran en segundos. Es la opción recomendada frente a eliminar.</Alert>
    </>
  );
}
