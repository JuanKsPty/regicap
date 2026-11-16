import { CheckCircle2 } from 'lucide-react';

const BENEFICIOS = ['Calificación automática con inteligencia artificial', 'Resultados disponibles el mismo día', 'Capacitaciones de proveedores externos en un solo lugar'];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-rol-participante/15 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-base font-extrabold">R</span>
          <span className="text-xl font-extrabold tracking-wide">REGICAP</span>
        </div>
        <div className="relative max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#8BA3CC]">Sistema de Registro Inteligente</p>
          <h2 className="mt-3 text-[28px] font-bold leading-tight">Capacitaciones que se evalúan solas y se entienden a la primera.</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#C3D0EA]">
            Plataforma para programas de capacitación de empresas: gestión de contenidos, inscripciones, resolución de módulos y análisis de resultados.
          </p>
          <ul className="mt-8 space-y-3">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-[#E4ECFA]">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-rol-participante" aria-hidden /> {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-[#8BA3CC]">© REGICAP 2026 · Ingeniería de Software II · UTP</p>
      </aside>
      <main id="contenido" className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="grid size-9 place-items-center rounded-xl bg-navy text-base font-extrabold text-white">R</span>
          <span className="text-xl font-extrabold tracking-wide text-navy">REGICAP</span>
        </div>
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
