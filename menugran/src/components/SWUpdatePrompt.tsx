'use client';

import { useState, useEffect } from 'react';

export default function SWUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onControllerChange = () => {
      // SW nuevo tomó control → recargar
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const onRegistration = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        setWaiting(reg.waiting);
      }

      reg.addEventListener('updatefound', () => {
        const newSw = reg.installing;
        if (!newSw) return;

        newSw.addEventListener('statechange', () => {
          if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
            // SW nuevo instalado, hay uno viejo activo → prompt
            setWaiting(newSw);
          }
        });
      });
    };

    navigator.serviceWorker.ready.then(onRegistration);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  const handleUpdate = () => {
    waiting.postMessage({ type: 'SKIP_WAITING' });
    setWaiting(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 p-4 md:bottom-6 md:p-6">
      <div className="mx-auto max-w-md rounded-xl border border-brand-200 bg-white p-4 shadow-elevated">
        <p className="text-sm font-semibold text-ink">
          Nueva version disponible
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Actualiza para tener la ultima version.
        </p>
        <button
          type="button"
          onClick={handleUpdate}
          className="btn-primary btn-md mt-3 w-full"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
