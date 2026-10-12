import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  requestPermissionAndShowTestNotification,
  TEST_NOTIFICATION_TITLE,
} from './localNotification';

type NotificationCtor = new (
  title: string,
  options?: NotificationOptions,
) => Notification;

/**
 * Instala una API de Notification falsa (nueva por prueba) en el entorno.
 * `serviceWorker.ready` se simula como promesa (igual que en el navegador).
 * Devuelve los mocks del Service Worker y del constructor.
 */
function installNotificationApi(overrides: {
  permission?: NotificationPermission;
  requestPermission?: () => Promise<NotificationPermission>;
  ctor?: NotificationCtor;
  /** Registro que resuelve `serviceWorker.ready` (por defecto, uno válido). */
  registration?: Promise<unknown>;
}): { showNotification: ReturnType<typeof vi.fn>; ctor: NotificationCtor } {
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const registration =
    overrides.registration ??
    Promise.resolve({ showNotification });

  const ctor =
    overrides.ctor ??
    (vi.fn(function FakeNotification(
      this: { title: string; options?: NotificationOptions },
      title: string,
      options?: NotificationOptions,
    ) {
      this.title = title;
      this.options = options;
    }) as unknown as NotificationCtor);

  Object.defineProperty(ctor, 'permission', {
    value: overrides.permission ?? 'default',
    writable: true,
    configurable: true,
  });
  Object.defineProperty(ctor, 'requestPermission', {
    value: overrides.requestPermission ?? vi.fn(),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, 'Notification', {
    value: ctor,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: registration },
    writable: true,
    configurable: true,
  });

  return { showNotification, ctor };
}

describe('requestPermissionAndShowTestNotification', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'Notification');
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('devuelve unsupported si el navegador no soporta notificaciones', async () => {
    const status = await requestPermissionAndShowTestNotification();
    expect(status).toBe('unsupported');
  });

  it('solicita permiso cuando está en default y muestra la notificación vía SW', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const { showNotification } = installNotificationApi({
      permission: 'default',
      requestPermission,
    });

    const status = await requestPermissionAndShowTestNotification();

    expect(status).toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith(
      TEST_NOTIFICATION_TITLE,
      expect.objectContaining({ tag: 'menugran-test-notification' }),
    );
  });

  it('no vuelve a pedir permiso si ya está concedido', async () => {
    const requestPermission = vi.fn();
    const { showNotification } = installNotificationApi({
      permission: 'granted',
      requestPermission,
    });

    const status = await requestPermissionAndShowTestNotification();

    expect(status).toBe('granted');
    expect(requestPermission).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it('devuelve denied si el usuario rechaza el permiso', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied');
    const { showNotification } = installNotificationApi({
      permission: 'default',
      requestPermission,
    });

    const status = await requestPermissionAndShowTestNotification();

    expect(status).toBe('denied');
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('hace fallback al constructor cuando el Service Worker falla', async () => {
    const ctorSpy = vi.fn() as unknown as NotificationCtor;
    installNotificationApi({
      permission: 'granted',
      ctor: ctorSpy,
      registration: Promise.reject(new Error('sw no disponible')),
    });

    const status = await requestPermissionAndShowTestNotification();

    expect(status).toBe('granted');
    expect(ctorSpy).toHaveBeenCalledWith(
      TEST_NOTIFICATION_TITLE,
      expect.objectContaining({ tag: 'menugran-test-notification' }),
    );
  });

  it('devuelve denied cuando tanto el SW como el constructor fallan', async () => {
    const ctorSpy = vi.fn(() => {
      throw new Error('fallo local');
    }) as unknown as NotificationCtor;
    installNotificationApi({
      permission: 'granted',
      ctor: ctorSpy,
      registration: Promise.reject(new Error('sw no disponible')),
    });

    const status = await requestPermissionAndShowTestNotification();

    expect(status).toBe('denied');
  });
});
