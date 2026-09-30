/**
 * Hook de integración de Google Analytics 4 (GA4) para SPAs.
 *
 * - Habilita GA4 al montar y cada vez que el usuario cambia su
 *   consentimiento de cookies (evento `COOKIE_CONSENT_EVENT`).
 * - Registra un `page_view` en cada cambio de ruta.
 * - No hace nada si `VITE_GA_MEASUREMENT_ID` no está configurada o el
 *   usuario no aceptó las cookies de analítica.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { enableGoogleAnalytics, getGaMeasurementId, trackPageView } from '../services/googleAnalytics';
import { COOKIE_CONSENT_EVENT } from '../utils/cookieConsent';

export function useGoogleAnalytics(): void {
  const location = useLocation();
  const measurementId = getGaMeasurementId();

  useEffect(() => {
    if (measurementId === undefined) return;
    enableGoogleAnalytics();
    const handleConsentChange = () => {
      enableGoogleAnalytics();
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
  }, [measurementId]);

  useEffect(() => {
    if (measurementId === undefined) return;
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search, measurementId]);
}
