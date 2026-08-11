import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Banner visual no intrusivo que advierte al usuario cuando la aplicación
 * está en modo sin conexión.
 *
 * Se muestra fijo en la parte superior, dentro del árbol de App, y desaparece
 * automáticamente cuando la conectividad se restablece.
 */
export function OfflineBanner(): React.ReactElement | null {
  const { isOnline } = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Modo sin conexión"
      className="fixed top-0 left-0 right-0 z-50 flex justify-center p-3 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg ring-1 ring-black/5 max-w-md">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <WifiOff className="h-5 w-5" />
        </div>
        <p className="flex-1 text-sm text-amber-800">
          <span className="font-semibold">Modo sin conexión</span>
          <span className="hidden sm:inline"> — algunos datos pueden no estar actualizados.</span>
        </p>
      </div>
    </div>
  );
}

export default OfflineBanner;
