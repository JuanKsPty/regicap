import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';
import { cn } from './cn';

const campoBase =
  'w-full rounded-lg border border-border bg-card px-3 text-sm text-fg placeholder:text-fg-3 transition-colors hover:border-fg-3 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary/30 disabled:cursor-not-allowed disabled:bg-bg-2 disabled:opacity-70 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger/30';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(campoBase, 'h-10', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, rows = 3, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(campoBase, 'min-h-20 py-2.5 leading-relaxed', className)} {...props} />
));
Textarea.displayName = 'Textarea';

/** Select nativo con el estilo del sistema (mejor accesibilidad y comportamiento móvil). */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(campoBase, 'h-10 appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235C6480' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

export const Label = React.forwardRef<React.ComponentRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('text-xs font-semibold text-fg', className)} {...props} />
));
Label.displayName = 'Label';

/** Etiqueta + control + mensaje de error junto al campo (EC-07). */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="text-xs text-fg-2">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}
