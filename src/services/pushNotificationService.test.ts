import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isPushSupported,
  urlBase64ToUint8Array,
  subscribeCurrentUserToPush,
  reconcilePushSubscription,
  sendTestPushNotification,
  sendBulkPushNotification,
  VAPID_PUBLIC_KEY,
} from './pushNotificationService';

const fromMock = vi.fn();
const upsertMock = vi.fn();
const invokeMock = vi.fn();
const selectMaybeSingleMock = vi.fn();

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
  const pushSubscription = createPushSubscriptionMock(subscriptionJson, VAPID_PUBLIC_KEY);
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

/** Crea un PushSubscription simulado, opcionalmente atado a otra clave VAPID. */
function createPushSubscriptionMock(
  json: typeof subscriptionJson,
  applicationServerKey: string | null,
) {
  return {
    toJSON: () => json,
    unsubscribe: vi.fn().mockResolvedValue(true),
    options:
      applicationServerKey === null
        ? undefined
        : { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(applicationServerKey) },
  };
}

/** Reinstala los mocks de push con un control granular sobre la suscripción. */
function installPushMocksWith(options: {
  existing: ReturnType<typeof createPushSubscriptionMock> | null;
  subscribed?: ReturnType<typeof createPushSubscriptionMock>;
}): void {
  const next = options.subscribed ?? createPushSubscriptionMock(subscriptionJson, VAPID_PUBLIC_KEY);
  const subscribeMock = vi.fn().mockResolvedValue(next);
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(options.existing),
          subscribe: subscribeMock,
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

describe('reconcilePushSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removePushMocks();
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: selectMaybeSingleMock }) }),
      upsert: (...args: unknown[]) => upsertMock(...args),
    });
    selectMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    upsertMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    removePushMocks();
  });

  it('retorna unsupported si el navegador no soporta Web Push', async () => {
    const result = await reconcilePushSubscription('user-1');
    expect(result).toEqual({ status: 'unsupported' });
  });

  it('retorna permission_denied sin tocar la BD si el permiso no está concedido', async () => {
    installPushMocks();
    vi.mocked(window.Notification.requestPermission).mockResolvedValue('denied');
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: class Notification {
        static permission = 'denied';
        static requestPermission = vi.fn().mockResolvedValue('denied');
      },
    });

    const result = await reconcilePushSubscription('user-1');

    expect(result).toEqual({ status: 'permission_denied' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('retorna absent cuando el navegador ya no tiene suscripción', async () => {
    installPushMocksWith({ existing: null });

    const result = await reconcilePushSubscription('user-1');

    expect(result).toEqual({ status: 'absent' });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('registra la suscripción cuando no existe en Supabase', async () => {
    installPushMocks();
    selectMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await reconcilePushSubscription('user-1');

    expect(result).toEqual({ status: 'synced' });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', is_active: true }),
      { onConflict: 'endpoint' },
    );
  });

  it('reactiva el registro cuando la suscripción fue marcada inactiva', async () => {
    installPushMocks();
    selectMaybeSingleMock.mockResolvedValue({
      data: { id: 'sub-1', p256dh: 'BKEY', auth: 'BAUTH', is_active: false },
      error: null,
    });

    const result = await reconcilePushSubscription('user-1');

    expect(result).toEqual({ status: 'synced' });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: subscriptionJson.endpoint, is_active: true }),
      { onConflict: 'endpoint' },
    );
  });

  it('no escribe si el registro ya está activo y sincronizado', async () => {
    installPushMocks();
    selectMaybeSingleMock.mockResolvedValue({
      data: { id: 'sub-1', p256dh: 'BKEY', auth: 'BAUTH', is_active: true },
      error: null,
    });

    const result = await reconcilePushSubscription('user-1');

    expect(result).toEqual({ status: 'synced' });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('re-suscribe cuando la suscripción del navegador usa una clave VAPID anterior', async () => {
    const stale = createPushSubscriptionMock(subscriptionJson, 'BOTHER-VAPID-KEY-VALUE');
    const fresh = createPushSubscriptionMock(subscriptionJson, VAPID_PUBLIC_KEY);
    installPushMocksWith({ existing: stale, subscribed: fresh });

    const result = await reconcilePushSubscription('user-1');

    expect(result).toEqual({ status: 'synced' });
    expect(stale.unsubscribe).toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', endpoint: subscriptionJson.endpoint }),
      { onConflict: 'endpoint' },
    );
  });

  it('devuelve error cuando la consulta del registro falla', async () => {
    installPushMocks();
    selectMaybeSingleMock.mockResolvedValue({ data: null, error: { message: 'rls' } });

    const result = await reconcilePushSubscription('user-1');

    expect(result.status).toBe('error');
  });
});
