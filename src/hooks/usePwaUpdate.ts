import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface UsePwaUpdateOptions {
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
}

export function usePwaUpdate(options: UsePwaUpdateOptions = {}) {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW(options);

  const closePrompt = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

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
