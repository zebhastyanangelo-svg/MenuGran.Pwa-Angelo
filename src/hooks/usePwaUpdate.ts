import { useCallback, useEffect, useState } from 'react';

interface UsePwaUpdateOptions {
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
}

const PWA_NEED_REFRESH_EVENT = 'pwa:need-refresh';
const PWA_OFFLINE_READY_EVENT = 'pwa:offline-ready';

export function usePwaUpdate(options: UsePwaUpdateOptions = {}) {
  const { onNeedRefresh, onOfflineReady } = options;
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  const updateServiceWorker = useCallback(async (reload = true) => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      if (reload) {
        window.location.reload();
      }
    } catch (error) {
      console.error('[PWA] Error al actualizar el Service Worker:', error);
    }
  }, []);

  const closePrompt = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleNeedRefresh = () => {
      setNeedRefresh(true);
      onNeedRefresh?.();
    };
    const handleOfflineReady = () => {
      setOfflineReady(true);
      onOfflineReady?.();
    };

    window.addEventListener(PWA_NEED_REFRESH_EVENT, handleNeedRefresh);
    window.addEventListener(PWA_OFFLINE_READY_EVENT, handleOfflineReady);

    return () => {
      window.removeEventListener(PWA_NEED_REFRESH_EVENT, handleNeedRefresh);
      window.removeEventListener(PWA_OFFLINE_READY_EVENT, handleOfflineReady);
    };
  }, [onNeedRefresh, onOfflineReady]);

  return {
    needRefresh,
    offlineReady,
    isUpdateAvailable: needRefresh,
    isOfflineReady: offlineReady,
    updateServiceWorker,
    closePrompt,
  };
}

interface UsePwaInstallResult {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  isInstalled: boolean;
}

export function usePwaInstall(): UsePwaInstallResult {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<void> => {
    if (installEvent === null) {
      return;
    }
    await installEvent.prompt();
    setInstallEvent(null);
  };

  return {
    canInstall: installEvent !== null,
    promptInstall,
    isInstalled,
  };
}
