import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { usePwaInstall, usePwaUpdate } from '../../hooks/usePwaUpdate';

/**
 * Banner que notifica (a) actualizaciones del Service Worker y la
 * disponibilidad offline de la PWA y (b) la posibilidad de instalar
 * MenuGram en el dispositivo mediante el prompt nativo del navegador.
 *
 * El componente es invisible por defecto y solo aparece cuando hay algo
 * que comunicar al usuario (actualización pendiente, app lista offline o
 * instalación disponible). Se renderiza al final del árbol en `App`.
 */
export function ReloadPrompt(): React.ReactElement | null {
  const { isUpdateAvailable, isOfflineReady, updateServiceWorker, closePrompt } =
    usePwaUpdate();
  const { canInstall, promptInstall } = usePwaInstall();

  const hasPrompt = isUpdateAvailable || isOfflineReady;
  if (!hasPrompt && !canInstall) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Notificaciones de la aplicación"
      className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center p-3 pointer-events-none"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          {isUpdateAvailable ? (
            <RefreshCw className="h-5 w-5" />
          ) : isOfflineReady ? (
            <WifiOff className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </div>

        <p className="flex-1 text-sm text-gray-700">
          {isUpdateAvailable
            ? 'Hay una nueva versión disponible. Actualiza para seguir usando MenuGram.'
            : isOfflineReady
              ? 'MenuGram está listo para funcionar sin conexión.'
              : 'Instala MenuGram en tu dispositivo para acceder más rápido.'}
        </p>

        <div className="flex flex-shrink-0 items-center gap-2">
          {isUpdateAvailable ? (
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Actualizar la aplicación"
            >
              Actualizar
            </button>
          ) : null}

          {canInstall && !hasPrompt ? (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Instalar MenuGram"
            >
              Instalar
            </button>
          ) : null}

          {hasPrompt ? (
            <button
              type="button"
              onClick={closePrompt}
              className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
