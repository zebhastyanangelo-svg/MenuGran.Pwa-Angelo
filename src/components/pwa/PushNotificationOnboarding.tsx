import { Bell, X } from 'lucide-react';
import { usePushNotificationOnboarding } from '../../hooks/usePushNotificationOnboarding';

/**
 * Modal de onboarding para solicitar permiso de notificaciones push.
 *
 * Aparece automáticamente al entrar a la app (después de un delay) para
 * solicitar amigablemente el permiso de notificaciones sin esperar a que
 * el usuario navegue a configuraciones.
 */
export function PushNotificationOnboarding() {
  const { showOnboarding, acceptOnboarding, dismissOnboarding } =
    usePushNotificationOnboarding();

  if (!showOnboarding) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-onboarding-title"
    >
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
        onClick={dismissOnboarding}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={dismissOnboarding}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-red/10">
          <Bell className="h-6 w-6 text-brand-red" aria-hidden="true" />
        </div>

        <h2
          id="push-onboarding-title"
          className="mb-2 text-lg font-bold text-slate-900"
        >
          ¿Deseas que te avisemos cuando tengas un comercio o buena comida cerca?
        </h2>

        <p className="mb-6 text-sm text-slate-600">
          Recibe notificaciones sobre promociones, nuevos restaurantes y ofertas
          especiales en tu zona.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={dismissOnboarding}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={() => void acceptOnboarding()}
            className="flex-1 rounded-xl bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
          >
            Sí, quiero recibir avisos
          </button>
        </div>
      </div>
    </div>
  );
}
