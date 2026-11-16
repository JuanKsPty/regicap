import type { ModuloEstadoDto } from '@regicap/types';
import { Badge, Button, Card, Progress } from '@regicap/ui';
import { CheckCircle2, Clock, Target } from 'lucide-react';
import Link from 'next/link';
import { colorPuntaje } from '@/components/inscripciones/estado-inscripcion-badge';

/** Módulo con título, nº de actividades, test, estado y puntaje; «Resolver →» solo si no está enviado (RF-09). */
export function ModuloItem({ modulo: m, inscripcionId }: { modulo: ModuloEstadoDto; inscripcionId: string }) {
  const enviado = m.estado === 'ENVIADO';
  const esTest = m.tipo === 'TEST';
  return (
    <Card className={`rise flex flex-col gap-2 ${esTest ? 'border-dashed' : ''}`}>
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2">
        <span className="inline-flex items-center gap-1">
          {esTest && <Target className="size-3" aria-hidden />}
          {esTest ? 'Evaluación final' : `Módulo ${m.orden}`}
        </span>
        {m.estado === 'BORRADOR' && <Badge tone="medio">Borrador</Badge>}
      </div>
      <h3 className="text-[14px] font-semibold leading-snug text-fg">{m.titulo}</h3>
      <p className="text-xs text-fg-2">
        {esTest
          ? `Formulario único con ${m.preguntas} pregunta${m.preguntas === 1 ? '' : 's'} de todos los módulos`
          : `${m.actividades} actividad${m.actividades === 1 ? '' : 'es'} de contenido${m.tieneTest ? ` · test de ${m.preguntas} pregunta${m.preguntas === 1 ? '' : 's'}` : ''}`}
      </p>
      <Progress value={enviado ? 100 : 0} label={`Estado de ${m.titulo}`} barClassName={enviado ? 'bg-success' : undefined} />
      <div className="mt-auto flex min-h-8 items-center justify-between gap-2 pt-1">
        {enviado ? (
          m.pendienteCalificacion ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning-fg">
              <Clock className="size-3.5" aria-hidden /> Pendiente de calificación
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-fg-2">
              <CheckCircle2 className="size-3.5 text-success" aria-hidden /> Enviado
            </span>
          )
        ) : (
          <span className="text-xs text-fg-2">Por resolver</span>
        )}
        {enviado ? (
          <div className="flex items-center gap-2">
            {m.puntaje !== null && <span className={`text-sm font-bold ${colorPuntaje(m.puntaje)}`}>{m.puntaje} pts</span>}
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/participante/tomar/${inscripcionId}/${m.id}`}>Ver</Link>
            </Button>
          </div>
        ) : (
          <Button size="sm" asChild>
            <Link href={`/participante/tomar/${inscripcionId}/${m.id}`}>{esTest ? 'Rendir test →' : 'Resolver →'}</Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
