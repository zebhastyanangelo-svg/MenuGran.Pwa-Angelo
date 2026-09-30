import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isPushSupported,
  urlBase64ToUint8Array,
  subscribeCurrentUserToPush,
  sendTestPushNotification,
  sendBulkPushNotification,
  VAPID_PUBLIC_KEY,
} from './pushNotificationService';

const fromMock = vi.fn();
const upsertMock = vi.fn();
const invokeMock = vi.fn();

const getSessionMock = vi.fn();

vi.mock('./supabase', () => ({
  TABLE_NAMES: {
    profiles: 'profiles',
    merchants: 'merchants',
    merchantStaff: 'merchant_staff',
    categories: 'categories',
    products: 'products',
    orders: 'orders',
    deliveries: 'deliveries',
    userPushSubscriptions: 'user_push_subscriptions',
  },
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    auth: { getSession: (...args: unknown[]) => getSessionMock(...args) },
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

const subscriptionJson = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  expirationTime: null,
  keys: { p256dh: 'BKEY', auth: 'BAUTH' },
};

/** Elimina los globals de push instalados por installPushMocks (orden-independencia). */
function removePushMocks(): void {
  const nav = navigator as unknown as Record<string, unknown>;
  const win = window as unknown as Record<string, unknown>;
  try { delete nav.serviceWorker; } catch { /* noop */ }
  try { delete win.PushManager; } catch { /* noop */ }
  try { delete win.Notification; } catch { /* noop */ }
}

function installPushMocks(): void {
  const pushSubscription = {
    toJSON: () => subscriptionJson,
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(pushSubscription),
          subscribe: vi.fn().mockResolvedValue(pushSubscription),
        },
      }),
    },
  });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: class PushManager {} });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: class Notification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');
    },
  });
}

describe('isPushSupported', () => {
  beforeEach(() => {
    removePushMocks();
  });

  afterEach(() => {
    removePushMocks();
  });

  it('devuelve false en un navegador sin PushManager (jsdom)', () => {
    expect(isPushSupported()).toBe(false);
  });

  it('devuelve true cuando el navegador expone SW, PushManager y Notification', () => {
    installPushMocks();
    expect(isPushSupported()).toBe(true);
  });
});

describe('urlBase64ToUint8Array', () => {
  it('convierte la clave pública VAPID en un Uint8Array de 65 bytes', () => {
    const bytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(0x04); // punto EC sin comprimir
  });

  it('rellena el padding base64 correctamente', () => {
    const bytes = urlBase64ToUint8Array('YWJj'); // 'abc' sin padding requerido
    expect(Array.from(bytes)).toEqual([97, 98, 99]);
  });
});

describe('subscribeCurrentUserToPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removePushMocks();
    fromMock.mockReturnValue({ upsert: (...args: unknown[]) => upsertMock(...args) });
    upsertMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    removePushMocks();
  });

  it('retorna unsupported si el navegador no soporta Web Push', async () => {
    const result = await subscribeCurrentUserToPush('user-1');
    expect(result).toEqual({ status: 'unsupported' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('suscribe, persiste la suscripción y reutiliza la existente', async () => {
    installPushMocks();

    const result = await subscribeCurrentUserToPush('user-1');

    expect(result).toEqual({ status: 'subscribed', alreadySubscribed: true });
    expect(fromMock).toHaveBeenCalledWith('user_push_subscriptions');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        endpoint: subscriptionJson.endpoint,
        p256dh: 'BKEY',
        auth: 'BAUTH',
        is_active: true,
      }),
      { onConflict: 'endpoint' },
    );
  });

  it('retorna denied cuando el usuario rechaza el permiso', async () => {
    installPushMocks();
    vi.mocked(window.Notification.requestPermission).mockResolvedValue('denied');

    const result = await subscribeCurrentUserToPush('user-1');

    expect(result).toEqual({ status: 'denied' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('retorna error con mensaje cuando el upsert falla', async () => {
    installPushMocks();
    upsertMock.mockResolvedValue({ error: { message: 'rls denied' } });

    const result = await subscribeCurrentUserToPush('user-1');

    expect(result.status).toBe('error');
    expect(result.status === 'error' && result.message).toContain('No se pudo registrar');
  });
});

describe('sendTestPushNotification / sendBulkPushNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
  });

  it('envía la notificación de prueba con target user', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, sent: 1, failed: 0, deactivated: 0, total: 1 },
      error: null,
    });

    const result = await sendTestPushNotification();

    expect(invokeMock).toHaveBeenCalledWith('send-push-notification', {
      body: { target: 'user' },
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.sent).toBe(1);
      expect(result.summary.total).toBe(1);
    }
  });

  it('envía la notificación masiva con título y cuerpo', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, sent: 10, failed: 2, deactivated: 1, total: 12 },
      error: null,
    });

    const result = await sendBulkPushNotification('Promo', '¡Hoy 2x1, {nombre}!');

    expect(invokeMock).toHaveBeenCalledWith('send-push-notification', {
      body: { target: 'all', title: 'Promo', body: '¡Hoy 2x1, {nombre}!' },
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.sent).toBe(10);
      expect(result.summary.deactivated).toBe(1);
    }
  });

  it('devuelve error controlado si no hay sesión activa', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    const result = await sendTestPushNotification();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('Sesión expirada');
    }
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('devuelve un mensaje de error controlado si la función falla', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'FunctionsHttpError' } });

    const result = await sendBulkPushNotification('Título', 'Cuerpo');

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain('No se pudo enviar');
  });

  it('devuelve error controlado si la respuesta es inválida', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });

    const result = await sendTestPushNotification();

    expect(result.ok).toBe(false);
  });
});
