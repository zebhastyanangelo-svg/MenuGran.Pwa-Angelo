import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  isPushSupported,
  subscribeCurrentUserToPush,
  type SubscribePushResult,
} from '../services/pushNotificationService';

const ONBOARDING_STORAGE_KEY = 'menugram-push-onboarding-dismissed';

type OnboardingStatus = 'pending' | 'accepted' | 'dismissed' | 'unsupported';

interface UsePushNotificationOnboardingResult {
  status: OnboardingStatus;
  showOnboarding: boolean;
  acceptOnboarding: () => Promise<SubscribePushResult>;
  dismissOnboarding: () => void;
}

/**
 * Hook para gestionar el onboarding de notificaciones push.
 *
 * Muestra un modal amigable al usuario para solicitar permiso de notificaciones
 * sin esperar a que navegue a configuraciones. Al aceptar, registra el service
 * worker, obtiene la suscripción VAPID y la guarda en Supabase.
 */
export function usePushNotificationOnboarding(): UsePushNotificationOnboardingResult {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>('pending');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus('unsupported');
      setShowOnboarding(false);
      return;
    }

    if (user === null) {
      setShowOnboarding(false);
      return;
    }

    // Si el permiso ya se concedió (onboarding automático de
    // `usePushNotifications`) o se denegó, no hay nada que preguntar: el
    // navegador no vuelve a mostrar el prompt tras una respuesta.
    if (Notification.permission !== 'default') {
      setStatus(Notification.permission === 'granted' ? 'accepted' : 'dismissed');
      setShowOnboarding(false);
      return;
    }

    const dismissed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (dismissed === 'true') {
      setStatus('dismissed');
      setShowOnboarding(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowOnboarding(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  const acceptOnboarding = useCallback(async (): Promise<SubscribePushResult> => {
    if (user === null) {
      return { status: 'error', message: 'Debes iniciar sesión para recibir notificaciones.' };
    }

    const result = await subscribeCurrentUserToPush(user.id, profile?.role ?? undefined);

    if (result.status === 'subscribed') {
      setStatus('accepted');
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    }

    setShowOnboarding(false);
    return result;
  }, [user, profile?.role]);

  const dismissOnboarding = useCallback(() => {
    setStatus('dismissed');
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
  }, []);

  return {
    status,
    showOnboarding,
    acceptOnboarding,
    dismissOnboarding,
  };
}
