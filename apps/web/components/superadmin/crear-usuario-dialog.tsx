'use client';

import { crearUsuarioSchema, TIPOS_EMPRESA, type CrearUsuarioInput, type Rol } from '@regicap/types';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogTitle, Field, Input, Select } from '@regicap/ui';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { ApiError } from '@/lib/api-client';
import { mensajeDe } from '@/lib/forms';
import { useEmpresasGestion, useUsuariosMutations } from '@/lib/queries';

export const ETIQUETA_ROL: Record<Rol, string> = { PARTICIPANTE: 'Participante', EMPRESA: 'Empresa', ADMINISTRADOR: 'Administrador', SUPERADMIN: 'Superadministrador' };
const ETIQUETA_TIPO: Record<string, string> = { cámara: 'Cámara de comercio', banco: 'Banco', plataforma: 'Plataforma', universidad: 'Universidad', gobierno: 'Gobierno', otro: 'Otro' };
const NUEVA = '__nueva';

/** Contraseña aleatoria legible (sin caracteres ambiguos). */
export function generarPassword(largo = 14): string {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(largo));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

/** Alta de una cuenta de cualquier rol (y, para «Empresa», de la organización). */
export function CrearUsuarioDialog({ abierto, onClose }: { abierto: boolean; onClose: () => void }) {
  const empresas = useEmpresasGestion();
  const { crear } = useUsuariosMutations();
  const { toast } = useToast();
  const [rol, setRol] = useState<Rol>('PARTICIPANTE');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresa, setEmpresa] = useState(NUEVA);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [empresaTipo, setEmpresaTipo] = useState('otro');
  const [errores, setErrores] = useState<Record<string, string>>({});

  const usaEmpresa = rol === 'EMPRESA' || rol === 'ADMINISTRADOR';
  const nueva = rol === 'EMPRESA' && empresa === NUEVA;

  async function enviar() {
    setErrores({});
    const candidato = {
      rol, nombre, email, password,
      ...(usaEmpresa && !nueva && empresa && empresa !== NUEVA ? { empresaId: empresa } : {}),
      ...(nueva ? { empresaNombre: empresaNombre.trim(), empresaTipo: empresaTipo as CrearUsuarioInput['empresaTipo'] } : {}),
    };
    const r = crearUsuarioSchema.safeParse(candidato);
    if (!r.success) {
      const e: Record<string, string> = {};
      for (const i of r.error.issues) e[String(i.path[0])] ??= i.message;
      return setErrores(e);
    }
    try {
      await crear.mutateAsync(r.data);
      toast(`Cuenta creada: ${r.data.email}`);
      setNombre(''); setEmail(''); setPassword(''); setEmpresaNombre('');
      onClose();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.campos).length) setErrores(e.campos);
      else setErrores({ _: mensajeDe(e) });
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogTitle>Nuevo usuario</DialogTitle>
        <DialogDescription>Crea una cuenta de cualquier rol. La persona podrá cambiar de contraseña solo a través de ti.</DialogDescription>
        <div className="mt-4 space-y-3.5">
          <Field label="Rol" error={errores.rol}>
            <Select value={rol} onChange={(e) => { setRol(e.target.value as Rol); setErrores({}); }}>
              {(Object.keys(ETIQUETA_ROL) as Rol[]).map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
            </Select>
          </Field>
          <Field label="Nombre completo" error={errores.nombre}>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} aria-invalid={!!errores.nombre} />
          </Field>
          <Field label="Correo electrónico" error={errores.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={!!errores.email} />
          </Field>
          <Field label="Contraseña inicial" error={errores.password} hint="Mínimo 8 caracteres">
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-invalid={!!errores.password} />
              <Button variant="secondary" onClick={() => setPassword(generarPassword())}>Generar</Button>
            </div>
          </Field>
          {usaEmpresa && (
            <Field label={rol === 'ADMINISTRADOR' ? 'Empresa del administrador' : 'Organización'} error={errores.empresaId}>
              <Select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
                {rol === 'EMPRESA' && <option value={NUEVA}>➕ Crear una empresa nueva</option>}
                {rol === 'ADMINISTRADOR' && <option value="">Elige una empresa…</option>}
                {empresas.data?.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </Select>
            </Field>
          )}
          {nueva && (
            <div className="grid gap-3.5 sm:grid-cols-[1fr_170px]">
              <Field label="Nombre de la empresa" error={errores.empresaNombre}>
                <Input value={empresaNombre} onChange={(e) => setEmpresaNombre(e.target.value)} aria-invalid={!!errores.empresaNombre} />
              </Field>
              <Field label="Tipo">
                <Select value={empresaTipo} onChange={(e) => setEmpresaTipo(e.target.value)}>
                  {TIPOS_EMPRESA.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>)}
                </Select>
              </Field>
            </div>
          )}
          {errores._ && <Alert tone="error">{errores._}</Alert>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={enviar} loading={crear.isPending}>Crear cuenta</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
