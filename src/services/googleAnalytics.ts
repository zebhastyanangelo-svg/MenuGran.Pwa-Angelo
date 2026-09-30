/**
 * Servicio de Google Analytics 4 (GA4) con Consent Mode v2.
 *
 * `index.html` inicializa `window.dataLayer` con el consentimiento por
 * defecto denegado. Este servicio solo carga `gtag.js` y envía datos
 * cuando el usuario acepta las cookies de analítica (banner de consentimiento).
 *
 * Los comandos `gtag(...)` se encolan en `dataLayer` hasta que el script
 * termina de cargarse, por lo que el arranque es seguro y idempotente.
 */

import { hasAnalyticsConsent } from '../utils/cookieConsent';

const GTAG_SCRIPT_ID = 'ga4-gtag-script';
const GTAG_SCRIPT_SRC_PREFIX = 'https://www.googletagmanager.com/gtag/js';

type GtagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFunction;
  }
}

/**
 * Devuelve el ID de medición de GA4 (ej. `G-XXXXXXXXXX`) desde la variable
 * de entorno `VITE_GA_MEASUREMENT_ID`, o `undefined` si no está configurada.
 */
export function getGaMeasurementId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  return id && id !== '' ? id : undefined;
}

function ensureDataLayer(): GtagFunction {
  window.dataLayer = window.dataLayer ?? [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
  return window.gtag;
}

/**
 * Indica si el script de GA4 ya fue inyectado en el documento.
 */
export function isGtagLoaded(): boolean {
  return document.getElementById(GTAG_SCRIPT_ID) !== null;
}

function injectGtagScript(measurementId: string): void {
  const script = document.createElement('script');
  script.id = GTAG_SCRIPT_ID;
  script.async = true;
  script.src = `${GTAG_SCRIPT_SRC_PREFIX}?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

/**
 * Actualiza Consent Mode v2 concediendo solo el almacenamiento de analítica.
 * La publicidad permanece siempre denegada (no se usan cookies publicitarias).
 */
export function grantAnalyticsConsent(): void {
  const gtag = ensureDataLayer();
  gtag('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
}

/**
 * Habilita GA4 si (y solo si) hay ID configurado y el usuario aceptó las
 * cookies de analítica. Es idempotente: reintentos no duplican el script.
 */
export function enableGoogleAnalytics(): boolean {
  const measurementId = getGaMeasurementId();
  if (measurementId === undefined || !hasAnalyticsConsent() || isGtagLoaded()) {
    return false;
  }
  try {
    const gtag = ensureDataLayer();
    grantAnalyticsConsent();
    gtag('js', new Date());
    gtag('config', measurementId, { anonymize_ip: true });
    injectGtagScript(measurementId);
    return true;
  } catch (error) {
    console.error('[GoogleAnalytics] No se pudo inicializar GA4:', error);
    return false;
  }
}

/**
 * Registra una vista de página (`page_view`) en la ruta actual.
 * No envía nada si falta el ID, el consentimiento o el script no está activo.
 */
export function trackPageView(path: string): void {
  const measurementId = getGaMeasurementId();
  if (measurementId === undefined || !hasAnalyticsConsent() || !isGtagLoaded()) {
    return;
  }
  const gtag = ensureDataLayer();
  gtag('event', 'page_view', { page_path: path, send_to: measurementId });
}
