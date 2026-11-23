'use client';

import { MSG_CU03_CATALOGO_VACIO, type CatalogoItemDto } from '@regicap/types';
import { Badge, Button, Card, EmptyState, SectionLabel, Skeleton } from '@regicap/ui';
import { ChevronLeft, ChevronRight, Library } from 'lucide-react';
import { useState } from 'react';
import { Consulta, Cuadricula } from '@/components/page';
import { useToast } from '@/components/toast';
import { ApiError } from '@/lib/api-client';
import { useCatalogo, useInscribirse } from '@/lib/queries';

/** Tarjeta del catálogo con acción directa «Inscribirme» (RNF-06: encontrar e inscribirse sin ayuda). */
function CatalogoCard({ item }: { item: CatalogoItemDto }) {
  const inscribir = useInscribirse();
  const { toast } = useToast();
  return (
    <Card className="rise flex flex-col gap-2">
      <SectionLabel>{item.empresa}</SectionLabel>
      <h3 className="text-[14px] font-semibold leading-snug text-fg">{item.titulo}</h3>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="neutral">{item.modulos} módulo{item.modulos === 1 ? '' : 's'}</Badge>
        <Badge tone="neutral">{item.duracion}</Badge>
      </div>
      <Button
        className="mt-auto"
        full
        loading={inscribir.isPending}
        onClick={() =>
          inscribir
            .mutateAsync(item.capacitacionId)
            .then(() => toast(`Te inscribiste en «${item.titulo}». La verás en Activas.`))
            .catch((e) => toast(e instanceof ApiError ? e.message : 'No se pudo completar la inscripción.', 'error'))
        }
      >
        Inscribirme →
      </Button>
    </Card>
  );
}

export function CatalogoGrid() {
  const [page, setPage] = useState(1);
  const query = useCatalogo(page);
  return (
    <Consulta query={query} esqueleto={<Skeleton className="h-36" />}>
      {(d) => {
        const paginas = Math.max(1, Math.ceil(d.total / d.pageSize));
        // Si tras inscribirse la página actual quedó vacía, retrocede
        if (d.items.length === 0 && page > 1) queueMicrotask(() => setPage(page - 1));
        return d.items.length ? (
          <>
            <Cuadricula cols={3}>{d.items.map((i) => <CatalogoCard key={i.capacitacionId} item={i} />)}</Cuadricula>
            {paginas > 1 && (
              <nav aria-label="Paginación del catálogo" className="mt-4 flex items-center justify-center gap-3">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="size-4" aria-hidden /> Anterior
                </Button>
                <span className="text-xs font-semibold text-fg-2">Página {page} de {paginas}</span>
                <Button size="sm" variant="secondary" disabled={page >= paginas} onClick={() => setPage(page + 1)}>
                  Siguiente <ChevronRight className="size-4" aria-hidden />
                </Button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState icon={<Library className="size-7" />} title={MSG_CU03_CATALOGO_VACIO} />
        );
      }}
    </Consulta>
  );
}
