import posthog from 'posthog-js'
import { hasAnalyticsConsent } from './utils/cookieConsent'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST

export const isPostHogEnabled = Boolean(posthogKey && posthogHost)

function requirePostHogConfig(value: string | undefined, variableName: string): value is string {
  if (value) {
    return true
  }

  if (import.meta.env.DEV) {
    throw new Error(
      `${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`,
    )
  }

  return false
}

/**
 * Sincroniza el estado de captura de PostHog con la preferencia de consentimiento
 * guardada en `localStorage` (`menugram_cookie_consent`).
 *
 * - `'all'` → PostHog captura eventos (analítica de producto).
 * - `'necessary'` / sin preferencia → no se captura ningún evento.
 *
 * Es idempotente: puede llamarse en cada cambio de consentimiento.
 */
export function syncPostHogConsent(): void {
  if (!isPostHogEnabled) return

  if (hasAnalyticsConsent()) {
    posthog.opt_in_capturing()
  } else {
    posthog.opt_out_capturing()
  }
}

if (
  requirePostHogConfig(posthogKey, 'VITE_POSTHOG_KEY') &&
  requirePostHogConfig(posthogHost, 'VITE_POSTHOG_HOST')
) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-05-30',
    logs: {
      serviceName: 'menugran-web',
      environment: import.meta.env.MODE,
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    // Privacidad: PostHog es una herramienta de analítica de terceros, así que
    // NO captura eventos hasta que el usuario acepte las cookies de analítica
    // en el banner de consentimiento (ver `syncPostHogConsent`).
    opt_out_capturing_by_default: true,
  })

  syncPostHogConsent()
}

export default posthog
