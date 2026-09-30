import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

interface LegalPageLayoutProps {
  title: string;
  updatedAt: string;
  intro: string;
  children: ReactNode;
}

interface LegalSectionProps {
  title: string;
  children: ReactNode;
}

/**
 * Estructura común de las páginas legales (privacidad, términos y cookies):
 * tarjeta blanca responsiva con título, fecha de última actualización,
 * introducción y secciones anidadas.
 */
export function LegalPageLayout({ title, updatedAt, intro, children }: LegalPageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-brand-red">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider">Información legal</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
        <p className="mt-2 text-xs font-medium text-slate-500">Última actualización: {updatedAt}</p>
      </header>
      <p className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-sm">
        {intro}
      </p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/**
 * Sección individual de una página legal con encabezado destacado.
 */
export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <h2 className="mb-2 text-base font-bold text-slate-900 md:text-lg">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

/**
 * Lista con viñetas reutilizable dentro de las secciones legales.
 */
export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
