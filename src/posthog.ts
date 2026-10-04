import posthog from 'posthog-js'

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
  })
}

export default posthog
