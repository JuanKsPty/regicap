import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as React from 'react';
import { cn } from './cn';

/* ───────── Card ───────── */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-[10px] border border-border bg-card p-4 shadow-card', className)} {...props} />
));
Card.displayName = 'Card';

export function SectionLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-[10px] font-bold uppercase tracking-[0.5px] text-fg-2', className)} {...props} />;
}

/* ───────── Badge / pill de estado ───────── */
const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 whitespace-nowrap', {
  variants: {
    tone: {
      alto: 'bg-success-bg text-success-fg',
      medio: 'bg-warning-bg text-warning-fg',
      bajo: 'bg-danger-bg text-danger-fg',
      curso: 'bg-primary-light text-primary',
      pendiente: 'bg-bg-2 text-fg-2',
      neutral: 'border border-border bg-card text-fg-2',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* ───────── Alert ───────── */
const alertVariants = cva('flex flex-wrap items-start gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-3 text-[13px] leading-snug', {
  variants: {
    tone: {
      info: 'border-primary/20 bg-primary-light text-primary',
      warning: 'border-warning/40 bg-warning-bg2 text-warning-fg',
      success: 'border-success/30 bg-success-bg text-success-fg',
      error: 'border-danger/30 bg-danger-bg text-danger-fg',
    },
  },
  defaultVariants: { tone: 'info' },
});
const alertIcons = { info: Info, warning: AlertTriangle, success: CheckCircle2, error: XCircle };
export function Alert({ className, tone = 'info', children, action, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & { action?: React.ReactNode }) {
  const Icon = alertIcons[tone ?? 'info'];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-[12rem] flex-1">{children}</div>
      {action && <div className="shrink-0 pl-[1.625rem] sm:pl-0">{action}</div>}
    </div>
  );
}

/* ───────── Progress ───────── */
export function Progress({ value, className, barClassName, label }: { value: number; className?: string; barClassName?: string; label?: string }) {
  return (
    <ProgressPrimitive.Root
      value={value}
      aria-label={label ?? 'Progreso'}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-bg-2', className)}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full rounded-full bg-primary transition-[width] duration-500', barClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

/* ───────── Métrica ───────── */
export function MetricCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: 'danger' | 'success' }) {
  return (
    <Card className="flex flex-col gap-1">
      <SectionLabel>{label}</SectionLabel>
      <div className={cn('text-2xl font-bold leading-tight text-fg', tone === 'danger' && 'text-danger-fg', tone === 'success' && 'text-success-fg')}>{value}</div>
      {hint && <div className="text-xs text-fg-2">{hint}</div>}
    </Card>
  );
}

/* ───────── Estados vacíos / carga ───────── */
export function EmptyState({ title, description, action, className, icon }: { title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-border bg-card px-6 py-8 text-center', className)}>
      {icon && <div className="text-fg-3">{icon}</div>}
      <div className="text-sm font-semibold text-fg">{title}</div>
      {description && <p className="max-w-md text-[13px] text-fg-2">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-primary', className)} aria-label="Cargando" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-bg-2', className)} aria-hidden />;
}
