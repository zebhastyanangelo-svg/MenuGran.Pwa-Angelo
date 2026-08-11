import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('pwa:need-refresh'))
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('pwa:offline-ready'))
    },
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      console.debug('[PWA] Service Worker registrado:', registration)
      if (registration) {
        void registration.update()
      }
    },
    onRegisterError(error: unknown) {
      console.error('[PWA] Error al registrar el Service Worker:', error)
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
