import { useState } from 'react';
import { Link } from 'react-router-dom';
import { readCookieConsent, saveCookieConsent, type CookieConsent } from '../../utils/cookieConsent';

const ACCEPT_ALL_LABEL = 'Aceptar todo';
const NECESSARY_ONLY_LABEL = 'Solo necesarias';

interface ConsentBannerViewProps {
  onAccept: (consent: CookieConsent) => void;
}

function ConsentBannerView({ onAccept }: ConsentBannerViewProps) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Aviso de cookies"
      data-testid="cookie-consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto w-full max-w-5xl px-3 pb-3 md:pl-64">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_-8px_32px_rgba(15,23,42,0.16)]">
          <p className="text-sm leading-relaxed text-slate-600">
            Usamos cookies y almacenamiento local técnicos para que la app funcione
            (sesión, carrito y pedidos) y, con tu permiso, cookies de{' '}
            <strong className="font-semibold text-slate-900">analítica (Google Analytics)</strong>{' '}
            para entender cómo se usa MenuGran y mejorarla. Consulta nuestra{' '}
            <Link
              to="/cookies"
              className="font-medium text-brand-red underline underline-offset-2 hover:text-[#c80024]"
            >
              Política de Cookies
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onAccept('necessary')}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
            >
              {NECESSARY_ONLY_LABEL}
            </button>
            <button
              type="button"
              onClick={() => onAccept('all')}
              className="rounded-xl border border-transparent bg-brand-red px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
            >
              {ACCEPT_ALL_LABEL}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Banner de consentimiento de cookies. Se muestra hasta que el usuario
 * elige una preferencia, la cual se persiste en `localStorage`
 * (`menugram_cookie_consent`) y activa/desactiva Google Analytics.
 */
export function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => readCookieConsent());

  if (consent !== null) {
    return null;
  }

  const handleAccept = (value: CookieConsent) => {
    saveCookieConsent(value);
    setConsent(value);
  };

  return <ConsentBannerView onAccept={handleAccept} />;
}
