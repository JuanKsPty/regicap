'use client';

import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '@regicap/ui';

type Tono = 'success' | 'error' | 'info';
interface Aviso {
  id: number;
  tono: Tono;
  mensaje: string;
}
interface Ctx {
  toast: (mensaje: string, tono?: Tono) => void;
}
const ToastCtx = createContext<Ctx>({ toast: () => undefined });
export const useToast = () => useContext(ToastCtx);

const ICONOS = { success: CheckCircle2, error: XCircle, info: Info };
const ESTILOS: Record<Tono, string> = {
  success: 'border-success/40 bg-success-bg text-success-fg',
  error: 'border-danger/40 bg-danger-bg text-danger-fg',
  info: 'border-primary/30 bg-primary-light text-primary',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const quitar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (mensaje: string, tono: Tono = 'success') => {
      const id = Date.now() + Math.random();
      setAvisos((a) => [...a.slice(-3), { id, tono, mensaje }]);
      setTimeout(() => quitar(id), tono === 'error' ? 7000 : 4000);
    },
    [quitar],
  );
  const valor = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastCtx.Provider value={valor}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:items-end">
        {avisos.map((a) => {
          const Icon = ICONOS[a.tono];
          return (
            <div key={a.id} className={cn('rise pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] font-medium shadow-pop', ESTILOS[a.tono])}>
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex-1">{a.mensaje}</span>
              <button aria-label="Cerrar aviso" onClick={() => quitar(a.id)} className="opacity-60 hover:opacity-100">
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
