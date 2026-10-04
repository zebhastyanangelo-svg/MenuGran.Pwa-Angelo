/**
 * Hook que mantiene PostHog sincronizado con el consentimiento de cookies.
 *
 * PostHog se inicializa con `opt_out_capturing_by_default: true`, por lo que
 * no captura ningún evento hasta que el usuario acepta las cookies de
 * analítica. Este hook reacciona al evento `COOKIE_CONSENT_EVENT` para
 * activar o desactivar la captura sin necesidad de recargar la página.
 */

import { useEffect } from 'react';
import { syncPostHogConsent } from '../posthog';
import { COOKIE_CONSENT_EVENT } from '../utils/cookieConsent';

export function usePostHogAnalytics(): void {
  useEffect(() => {
    syncPostHogConsent();

    const handleConsentChange = () => {
      syncPostHogConsent();
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
  }, []);
}
