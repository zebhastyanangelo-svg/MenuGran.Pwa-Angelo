import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { registerSW } from 'virtual:pwa-register'
import 'animate.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'
import App from './App.tsx'
import posthog, { isPostHogEnabled } from './posthog'
import { refreshBCVRateIfStale, startPeriodicBCVRefresh } from './services/exchangeRate'

let swRegistration: ServiceWorkerRegistration | undefined
let hasController = navigator.serviceWorker?.controller !== null

/**
 * Actualiza el Service Worker atrapando el rechazo de la promesa.
 *
 * `registration.update()` falla con "Failed to update a ServiceWorker: An
 * unknown error occurred" en móviles con señal inestable (o cuando
 * importScripts no alcanza la red). Si el rechazo no se maneja, PostHog lo
 * reporta como error no capturado; aquí se degrada a un log silencioso.
 */
async function safeUpdateServiceWorker(): Promise<void> {
  const registration = swRegistration
  if (!registration) return
  try {
    await registration.update()
  } catch (error) {
    console.debug('[PWA] Actualización del Service Worker pospuesta:', error)
  }
}

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
        void safeUpdateServiceWorker()
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
  // Con `clientsClaim: true` la PRIMERA activación también dispara el evento:
  // se recarga solo si ya había un controller previo (es decir, es una
  // actualización) para evitar recargas en bucle en la primera visita.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController) {
      hasController = true
      return
    }
    window.location.reload()
  })
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Al volver de segundo plano se fuerza la consulta de la tasa BCV si la
    // caché ya expiró, para no calcular precios en bolívares con una tasa
    // estancada del día anterior.
    void refreshBCVRateIfStale();
    if (swRegistration) {
      void safeUpdateServiceWorker()
    }
  }
})

// Tasa BCV en tiempo real: polling a DolarVZLA cada 5 minutos mientras la
// app esté abierta (la caché efímera también vence a los 5 minutos). La tasa
// se mantiene solo en memoria/localStorage, nunca en la base de datos.
startPeriodicBCVRefresh()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
