'use client';

import type { DecisionDto } from '@regicap/types';
import { Alert, Badge, Button, Card, MetricCard, SectionLabel, Skeleton, cn } from '@regicap/ui';
import { CheckCircle2, Circle } from 'lucide-react';
import { Consulta, Cuadricula, PageHeader } from '@/components/page';
import { useToast } from '@/components/toast';
import { mensajeDe } from '@/lib/forms';
import { useAnalisis, useMarcarDecision } from '@/lib/queries';
import { Donut, EvolucionCohortes } from './charts';

const TONO: Record<DecisionDto['tipo'], 'warning' | 'info' | 'success'> = { warning: 'warning', info: 'info', success: 'success' };

/** CU-09 Analizar resultados (extiende CU-08): evolución por cohorte y decisiones recomendadas. */
export function AnalizarResultadosPage() {
  const query = useAnalisis();
  const marcar = useMarcarDecision();
  const { toast } = useToast();
  return (
    <Consulta query={query} esqueleto={<Skeleton className="h-72" />}>
      {(d) => (
        <>
          <PageHeader
            title="Analizar resultados"
            subtitle="Resultados agregados para definir caminos de mejora."
            actions={
              <>
                <Badge tone="curso">Cohorte {d.cohorteActual}</Badge>
                <Badge tone="alto">Datos actualizados ✓</Badge>
              </>
            }
          />
          <Cuadricula cols={4}>
            <MetricCard label="Total inscritos" value={d.metricas.totalInscritos} hint="inscripciones vigentes" />
            <MetricCard label="Tasa de participación" value={`${d.metricas.tasaParticipacion}%`} hint="con al menos un módulo enviado" />
            <MetricCard label="Capacitación más débil" value={d.metricas.capacitacionMasDebil ? `${d.metricas.capacitacionMasDebil.puntaje} pts` : '—'} hint={d.metricas.capacitacionMasDebil?.nombre ?? 'sin datos'} tone="danger" />
            <MetricCard label="Capacitación más fuerte" value={d.metricas.capacitacionMasFuerte ? `${d.metricas.capacitacionMasFuerte.puntaje} pts` : '—'} hint={d.metricas.capacitacionMasFuerte?.nombre ?? 'sin datos'} tone="success" />
          </Cuadricula>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1.4fr_1fr]">
            <Card>
              <SectionLabel className="mb-3">Evolución por cohorte</SectionLabel>
              <EvolucionCohortes datos={d.evolucion} />
            </Card>
            <Card>
              <SectionLabel className="mb-3">Decisiones recomendadas</SectionLabel>
              {d.decisiones.length ? (
                <ul className="space-y-2">
                  {d.decisiones.map((x) => (
                    <li key={x.clave}>
                      <Alert
                        tone={TONO[x.tipo]}
                        className={cn(x.aplicada && 'opacity-70')}
                        action={
                          <Button size="sm" variant="secondary" disabled={marcar.isPending} onClick={() => marcar.mutateAsync({ clave: x.clave, aplicada: !x.aplicada }).catch((e) => toast(mensajeDe(e), 'error'))}>
                            {x.aplicada ? <CheckCircle2 className="size-3.5 text-success" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                            {x.aplicada ? 'Aplicada' : 'Marcar como aplicada'}
                          </Button>
                        }
                      >
                        <span className={cn(x.aplicada && 'line-through')}>{x.texto}</span>
                      </Alert>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-fg-2">Aún no hay datos suficientes para recomendar decisiones.</p>
              )}
            </Card>
            <Card>
              <SectionLabel className="mb-3">Distribución de resultados</SectionLabel>
              <Donut dist={d.distribucion} />
            </Card>
          </div>
          <p className="mt-4 text-xs text-fg-2">Última actualización: {new Date(d.actualizadoEn).toLocaleString('es')}</p>
        </>
      )}
    </Consulta>
  );
}
