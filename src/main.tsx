import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { registerSW } from 'virtual:pwa-register'
import 'animate.css'
import './index.css'
import App from './App.tsx'
import posthog, { isPostHogEnabled } from './posthog'

let swRegistration: ServiceWorkerRegistration | undefined

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      if (isPostHogEnabled) {
        posthog.logger.info('service worker update available', {
          event: 'service_worker_update_available',
        })
      }
      window.dispatchEvent(new CustomEvent('pwa:need-refresh'))
    },
    onOfflineReady() {
      if (isPostHogEnabled) {
        posthog.logger.info('service worker offline ready', {
          event: 'service_worker_offline_ready',
        })
      }
      window.dispatchEvent(new CustomEvent('pwa:offline-ready'))
    },
    onRegistered(registration) {
      swRegistration = registration
      console.debug('[PWA] Service Worker registrado:', registration)
      if (registration) {
        if (isPostHogEnabled) {
          posthog.logger.info('service worker registered', {
            event: 'service_worker_registered',
          })
        }
        void registration.update()
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Error al registrar el Service Worker:', error)
      if (isPostHogEnabled) {
        posthog.logger.error('service worker registration failed', {
          event: 'service_worker_registration_failed',
          error_type: error instanceof Error ? error.name : 'unknown',
        })
      }
    },
  })

  // When a new Service Worker takes control, reload to pick up the new version.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && swRegistration) {
    void swRegistration.update()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
