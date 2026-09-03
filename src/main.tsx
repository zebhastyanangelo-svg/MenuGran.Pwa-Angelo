import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

let swRegistration: ServiceWorkerRegistration | undefined

if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('pwa:need-refresh'))
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('pwa:offline-ready'))
    },
    onRegistered(registration) {
      swRegistration = registration
      console.debug('[PWA] Service Worker registrado:', registration)
      if (registration) {
        void registration.update()
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Error al registrar el Service Worker:', error)
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
