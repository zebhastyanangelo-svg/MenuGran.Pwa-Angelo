import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePushNotifications } from './usePushNotifications';

const serviceMocks = vi.hoisted(() => ({
  isPushSupported: vi.fn(),
  subscribeCurrentUserToPush: vi.fn(),
}));

vi.mock('../services/pushNotificationService', () => ({
  isPushSupported: serviceMocks.isPushSupported,
  subscribeCurrentUserToPush: serviceMocks.subscribeCurrentUserToPush,
}));

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('./useAuth', () => ({
  useAuth: authMocks.useAuth,
}));

type PermissionState = 'default' | 'granted' | 'denied';

interface NotificationStub {
  permission: PermissionState;
  requestPermission: ReturnType<typeof vi.fn>;
}

interface PeriodicSyncStub {
  getTags: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
}

let notificationStub: NotificationStub;
let periodicSyncStub: PeriodicSyncStub;

function installBrowser(overrides: Partial<NotificationStub> = {}): void {
  const requestPermission =
    overrides.requestPermission ??
    vi.fn(async () => {
      // El navegador real actualiza Notification.permission tras responder.
      notificationStub.permission = 'granted';
      return 'granted';
    });

  notificationStub = {
    permission: overrides.permission ?? 'default',
    requestPermission,
  };

  vi.stubGlobal('Notification', function StubNotification() {} as unknown as {
    permission: PermissionState;
    requestPermission: () => Promise<PermissionState>;
  });
  Object.defineProperty(globalThis.Notification, 'permission', {
    get: () => notificationStub.permission,
    configurable: true,
  });
  Object.defineProperty(globalThis.Notification, 'requestPermission', {
    value: notificationStub.requestPermission,
    configurable: true,
  });
}

function installServiceWorker(periodicSync?: PeriodicSyncStub): void {
  periodicSyncStub =
    periodicSync ??
    ({
      getTags: vi.fn().mockResolvedValue([]),
      register: vi.fn().mockResolvedValue(undefined),
    } as PeriodicSyncStub);

  const registration = {
    periodicSync: periodicSyncStub,
  };

  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve(registration) },
    configurable: true,
  });
}

function mockUser(overrides: Record<string, unknown> = {}): void {
  authMocks.useAuth.mockReturnValue({
    user: { id: 'user-1' },
    profile: { role: 'customer' },
    isLoading: false,
    ...overrides,
  });
}

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    serviceMocks.isPushSupported.mockReturnValue(true);
    serviceMocks.subscribeCurrentUserToPush.mockResolvedValue({
      status: 'subscribed',
      alreadySubscribed: false,
    });
    mockUser();
    installBrowser();
    installServiceWorker();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });
  });

  it('marca unsupported y no pide permiso cuando el navegador no soporta push', () => {
    serviceMocks.isPushSupported.mockReturnValue(false);

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.status).toBe('unsupported');
    expect(notificationStub.requestPermission).not.toHaveBeenCalled();
  });

  it('no pide el permiso mientras no hay usuario autenticado', () => {
    mockUser({ user: null, profile: null });

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.status).toBe('idle');
    expect(notificationStub.requestPermission).not.toHaveBeenCalled();
  });

  it('pide el permiso de inmediato al cargar con sesión iniciada', async () => {
    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(notificationStub.requestPermission).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(result.current.status).toBe('granted');
    });

    expect(serviceMocks.subscribeCurrentUserToPush).toHaveBeenCalledWith('user-1', 'customer');
  });

  it('registra el Periodic Sync de recordatorios al suscribirse', async () => {
    renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(periodicSyncStub.register).toHaveBeenCalledWith('menugram-reminders', {
        minInterval: 24 * 60 * 60 * 1000,
      });
    });
  });

  it('con permiso ya concedido sincroniza sin volver a mostrar el prompt', async () => {
    installBrowser({ permission: 'granted' });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.status).toBe('granted');
    });
    expect(notificationStub.requestPermission).not.toHaveBeenCalled();
    expect(serviceMocks.subscribeCurrentUserToPush).toHaveBeenCalledWith('user-1', 'customer');
  });

  it('con permiso denegado no suscribe ni registra recordatorios', async () => {
    installBrowser({ permission: 'denied' });

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.status).toBe('denied');
    expect(notificationStub.requestPermission).not.toHaveBeenCalled();
    expect(serviceMocks.subscribeCurrentUserToPush).not.toHaveBeenCalled();
    expect(periodicSyncStub.register).not.toHaveBeenCalled();
  });

  it('no repite el pedido de permiso más de una vez por sesión de pestaña', async () => {
    const { unmount } = renderHook(() => usePushNotifications());
    await waitFor(() => {
      expect(notificationStub.requestPermission).toHaveBeenCalledTimes(1);
    });
    unmount();

    const second = renderHook(() => usePushNotifications());
    await act(async () => {
      await Promise.resolve();
    });

    expect(notificationStub.requestPermission).toHaveBeenCalledTimes(1);
    // El permiso ya quedó concedido en el primer montaje: el segundo solo
    // sincroniza la suscripción, sin volver a mostrar el prompt.
    await waitFor(() => {
      expect(second.result.current.status).toBe('granted');
    });
  });

  it('expone el error cuando la suscripción falla', async () => {
    serviceMocks.subscribeCurrentUserToPush.mockResolvedValue({
      status: 'error',
      message: 'No se pudo registrar tu dispositivo para notificaciones.',
    });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.message).toBe(
      'No se pudo registrar tu dispositivo para notificaciones.',
    );
  });

  it('no registra Periodic Sync cuando el navegador no lo soporta', async () => {
    installServiceWorker(undefined as unknown as PeriodicSyncStub);
    // Navegador sin periodicSync en el registro del SW.
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({}) },
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.status).toBe('granted');
    });
  });
});
