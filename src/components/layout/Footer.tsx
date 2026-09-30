import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const LEGAL_LINKS = [
  { to: '/privacy', label: 'Política de Privacidad' },
  { to: '/terms', label: 'Términos y Condiciones' },
  { to: '/cookies', label: 'Política de Cookies' },
];

/**
 * Pie de página de MenuGram con los enlaces legales de la plataforma.
 * Se renderiza al final del layout principal (rutas con navegación).
 */
export function Footer() {
  return (
    <footer
      className="px-4 pb-24 pt-2 md:pb-6 md:pl-64"
      data-testid="app-footer"
      aria-label="Pie de página"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 border-t border-slate-200 pt-4 text-center md:flex-row md:justify-between md:pl-0 md:text-left">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} MenuGram. Todos los derechos reservados.
        </p>
        <nav aria-label="Enlaces legales">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {LEGAL_LINKS.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-brand-red"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
