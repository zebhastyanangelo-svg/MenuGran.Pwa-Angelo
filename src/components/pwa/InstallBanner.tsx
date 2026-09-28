import { usePwaInstall } from '../../contexts/PwaInstallContext';
import { Download } from 'lucide-react';
import { Button } from '../ui/Button';

export function InstallBanner() {
  const { canInstall, promptInstall, dismissBanner, isInstalled } = usePwaInstall();

  if (!canInstall || isInstalled) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:max-w-md md:left-auto md:right-4 z-50 animate-slide-up"
      role="dialog"
      aria-label="Instalar aplicación"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
        <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <Download className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            Instalar MenuGram
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            Accede rápido desde tu pantalla de inicio y usa la app sin conexión
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={dismissBanner}
            aria-label="Descartar"
          >
            Ahora no
          </Button>
          <Button size="sm" onClick={promptInstall} className="bg-red-600 hover:bg-red-700">
            Instalar
          </Button>
        </div>
      </div>
    </div>
  );
}