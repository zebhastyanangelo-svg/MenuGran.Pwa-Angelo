/**
 * Hook de integración de Google Analytics 4 (GA4) para SPAs.
 *
 * - Habilita GA4 al montar y cada vez que el usuario cambia su
 *   consentimiento de cookies (evento `COOKIE_CONSENT_EVENT`).
 * - Registra un `page_view` en cada cambio de ruta.
 * - Cuando el consentimiento se otorga a mitad de sesión, registra la vista
 *   de la ruta actual (si no, esa visita nunca se contaría).
 * - No hace nada si `VITE_GA_MEASUREMENT_ID` no está configurada o el
 *   usuario no aceptó las cookies de analítica.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { enableGoogleAnalytics, getGaMeasurementId, trackPageView } from '../services/googleAnalytics';
import { COOKIE_CONSENT_EVENT } from '../utils/cookieConsent';

export function useGoogleAnalytics(): void {
  const location = useLocation();
  const measurementId = getGaMeasurementId();
  const currentPath = `${location.pathname}${location.search}`;
  const pathRef = useRef(currentPath);

  useEffect(() => {
    pathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    if (measurementId === undefined) return;
    enableGoogleAnalytics();
    const handleConsentChange = () => {
      if (enableGoogleAnalytics()) {
        trackPageView(pathRef.current);
      }
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
  }, [measurementId]);

  useEffect(() => {
    if (measurementId === undefined) return;
    trackPageView(currentPath);
  }, [currentPath, measurementId]);
}
