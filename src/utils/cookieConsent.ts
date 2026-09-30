/**
 * Gestión del consentimiento de cookies de MenuGram.
 *
 * La preferencia del usuario se persiste en `localStorage` bajo la clave
 * `menugram_cookie_consent` con dos valores posibles:
 * - `'all'`: acepta cookies técnicas y de analítica (GA4).
 * - `'necessary'`: solo cookies estrictamente necesarias.
 *
 * Al guardar una preferencia se emite el evento `COOKIE_CONSENT_EVENT`
 * en `window` para que otros módulos (p. ej. Google Analytics) reaccionen
 * sin recargar la página.
 */

export const COOKIE_CONSENT_STORAGE_KEY = 'menugram_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'menugram:cookie-consent-change';

export type CookieConsent = 'all' | 'necessary';

function isValidConsent(value: string | null): value is CookieConsent {
  return value === 'all' || value === 'necessary';
}

/**
 * Lee la preferencia guardada. Devuelve `null` si no hay preferencia
 * (o si `localStorage` no está disponible, p. ej. modo privado).
 */
export function readCookieConsent(): CookieConsent | null {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return isValidConsent(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Guarda la preferencia y notifica a los suscriptores del evento
 * `COOKIE_CONSENT_EVENT`. Falla de forma silenciosa (con log) si el
 * almacenamiento no está disponible.
 */
export function saveCookieConsent(consent: CookieConsent): void {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, consent);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { consent } }));
  } catch (error) {
    console.error('[CookieConsent] No se pudo guardar la preferencia:', error);
  }
}

/**
 * Indica si el usuario otorgó consentimiento para analítica (GA4).
 */
export function hasAnalyticsConsent(): boolean {
  return readCookieConsent() === 'all';
}
