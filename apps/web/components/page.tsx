'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, Button, Skeleton, cn } from '@regicap/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { mensajeDe } from '@/lib/forms';

export function PageHeader({ title, subtitle, actions, back }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <ArrowLeft className="size-3.5" aria-hidden /> {back.label}
          </Link>
        )}
        <h1 className="text-base font-bold leading-snug text-fg sm:text-lg">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-fg-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, aside, children, className }: { title?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('mt-6', className)}>
      {(title || aside) && (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** "Error al cargar información" con Reintentar (flujo de excepción del diseño). */
export function ErrorCarga({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert tone="warning" action={onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Reintentar</Button>}>
      <strong className="font-semibold">No se pudo cargar la información.</strong> {mensajeDe(error)}
    </Alert>
  );
}

/** Estados de carga / error / datos de una consulta. */
export function Consulta<T>({
  query,
  esqueleto,
  children,
}: {
  query: UseQueryResult<T>;
  esqueleto?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending) {
    return (
      esqueleto ?? (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )
    );
  }
  if (query.isError) return <ErrorCarga error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}

export const Cuadricula = ({ cols = 3, className, children }: { cols?: 2 | 3 | 4; className?: string; children: React.ReactNode }) => (
  <div className={cn('grid gap-3', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3', cols === 4 && 'grid-cols-2 lg:grid-cols-4', className)}>{children}</div>
);
