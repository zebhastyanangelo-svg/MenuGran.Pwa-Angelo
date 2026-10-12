/**
 * Disparo de notificación local de prueba desde el panel de SuperAdmin.
 *
 * Verifica el soporte del navegador, solicita permiso con
 * `Notification.requestPermission()` cuando aún está en estado `default` y
 * muestra la alerta preferentemente vía Service Worker (con fallback al
 * constructor `Notification`).
 */

export type LocalNotificationStatus = 'granted' | 'denied' | 'unsupported';

export const TEST_NOTIFICATION_TITLE = 'Es hora de comer 🍽️';
export const TEST_NOTIFICATION_BODY =
  'Notificación de prueba de MenuGran: si la ves, las alertas funcionan en este dispositivo.';

function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function showViaServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('no-sw');
  }
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(TEST_NOTIFICATION_TITLE, {
    body: TEST_NOTIFICATION_BODY,
    tag: 'menugran-test-notification',
    data: { url: '/marketplace' },
  });
}

function showViaConstructor(): void {
  new Notification(TEST_NOTIFICATION_TITLE, {
    body: TEST_NOTIFICATION_BODY,
    tag: 'menugran-test-notification',
  });
}

/**
 * Solicita permiso (si falta) y muestra la notificación de prueba.
 *
 * Devuelve el estado final: `granted` si se mostró, `denied` si el usuario
 * rechazó el permiso y `unsupported` si el navegador no soporta notificaciones.
 * Nunca lanza: los fallos de envío degradan a `denied` tras registrarlos.
 */
export async function requestPermissionAndShowTestNotification(): Promise<LocalNotificationStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  let permission: NotificationPermission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch (error) {
      console.error('[Notificaciones] Error al solicitar permiso:', error);
      return 'denied';
    }
  }
  if (permission !== 'granted') {
    return 'denied';
  }

  try {
    await showViaServiceWorker();
    return 'granted';
  } catch (error) {
    console.warn(
      '[Notificaciones] Service Worker no disponible, usando fallback local:',
      error,
    );
  }

  try {
    showViaConstructor();
    return 'granted';
  } catch (error) {
    console.error('[Notificaciones] Error al mostrar la notificación de prueba:', error);
    return 'denied';
  }
}
