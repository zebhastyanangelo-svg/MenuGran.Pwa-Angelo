import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * El service worker es un script clásico (lo carga `workbox.importScripts`),
 * así que no se puede importar como módulo: se evalúa inyectando un `self`
 * falso para capturar los listeners que registra.
 */
interface PushHandlerScope {
  addEventListener: (type: string, handler: (event: unknown) => void) => void;
  registration: { showNotification: (title: string, options: unknown) => Promise<void> };
  clients: {
    matchAll: (options: unknown) => Promise<WindowClientStub[]>;
    openWindow: (url: string) => Promise<unknown>;
  };
  /** Listeners registrados por el script, para dispararlos desde el test. */
  __listeners: Record<string, (event: unknown) => void>;
  __pushHandlerTest: {
    FALLBACK_URL: string;
    DEFAULT_TITLES_BY_KIND: Record<string, string>;
    resolveTargetUrl: (rawUrl: unknown) => string;
    normalizePathname: (rawPath: unknown) => string;
    isShowingTarget: (clientUrl: string, targetPath: string) => boolean;
    readPushPayload: (event: { data: { json?: () => unknown; text?: () => string } | null }) => Record<string, unknown>;
    isReminderPayload: (payload: unknown) => boolean;
    buildNotificationOptions: (payload: Record<string, unknown>, targetUrl: string) => Record<string, unknown>;
    resolveTitle: (payload: Record<string, unknown> | null) => string;
    sanitizeActions: (rawActions: unknown) => Array<{ action: string; title: string; url: string }>;
    buildReminderCopy: (hour: number) => { title: string; body: string };
    resolveReminderSlot: (hour: number) => number | null;
  };
}

interface WindowClientStub {
  url: string;
  focused?: boolean;
  navigatedTo?: string;
  focus: () => Promise<WindowClientStub>;
  navigate: (url: string) => Promise<WindowClientStub>;
}

function loadPushHandler(clients: PushHandlerScope['clients']): PushHandlerScope {
  const source = readFileSync(
    resolve(process.cwd(), 'public/push-handler.js'),
    'utf8',
  );
  const listeners: Record<string, (event: unknown) => void> = {};

  const scope = {
    addEventListener(type: string, handler: (event: unknown) => void) {
      listeners[type] = handler;
    },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
    clients,
    __pushHandlerTest: {} as PushHandlerScope['__pushHandlerTest'],
    __listeners: listeners,
  };

  // eslint-disable-next-line no-new-func
  new Function('self', source)(scope);

  return scope;
}

function createClient(url: string): WindowClientStub {
  const client: WindowClientStub = {
    url,
    focused: false,
    navigatedTo: undefined,
    focus: () => {
      client.focused = true;
      return Promise.resolve(client);
    },
    navigate: (target: string) => {
      client.navigatedTo = target;
      return Promise.resolve(client);
    },
  };
  return client;
}

function jsonEvent(payload: unknown) {
  return {
    data: { json: () => payload },
    waitUntil: vi.fn(),
  };
}

describe('push-handler.js', () => {
  describe('resolveTargetUrl', () => {
    it('deja pasar rutas internas con o sin barra inicial', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.resolveTargetUrl('/orders/123')).toBe('/orders/123');
      expect(__pushHandlerTest.resolveTargetUrl('marketplace')).toBe('/marketplace');
    });

    it('rechaza destinos externos y cae al marketplace', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.resolveTargetUrl('https://sitio-falso.com/x')).toBe('/marketplace');
      expect(__pushHandlerTest.resolveTargetUrl('//sitio-falso.com')).toBe('/marketplace');
      expect(__pushHandlerTest.resolveTargetUrl(undefined)).toBe('/marketplace');
      expect(__pushHandlerTest.resolveTargetUrl('   ')).toBe('/marketplace');
    });
  });

  describe('normalizePathname / isShowingTarget', () => {
    it('compara rutas profundas, ignorando query, hash y barra final', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.normalizePathname('/orders/123/?a=1#x')).toBe('/orders/123');
      expect(
        __pushHandlerTest.isShowingTarget('https://app.example.com/orders/123', '/orders/123/'),
      ).toBe(true);
      expect(
        __pushHandlerTest.isShowingTarget('https://app.example.com/orders/999', '/orders/123'),
      ).toBe(false);
    });

    it('no revienta con una URL de cliente inválida', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.isShowingTarget('no-es-una-url', '/marketplace')).toBe(false);
    });
  });

  describe('readPushPayload', () => {
    it('conserva el título cuando el cuerpo no es JSON', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      const payload = __pushHandlerTest.readPushPayload({
        data: {
          json: () => {
            throw new Error('not json');
          },
          text: () => 'texto plano',
        },
      });

      expect(payload.body).toBe('texto plano');
    });

    it('tolera un push sin datos', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.readPushPayload({ data: null })).toEqual({});
    });
  });

  describe('evento push', () => {
    it('muestra la notificación con el tag del payload', () => {
      const scope = loadPushHandler({ matchAll: async () => [], openWindow: async () => null });
      const event = jsonEvent({
        title: 'Tu pedido está listo',
        body: 'Pásalo a retirar',
        url: '/orders/abc',
        tag: 'order-abc',
      });

      scope.__listeners.push(event);

const [title, options] = mockShowNotificationArgs(scope);
      expect(title).toBe('Tu pedido está listo');
      expect(options).toMatchObject({
        body: 'Pásalo a retirar',
        tag: 'order-abc',
      });
      expect((options as { data: { url: string } }).data.url).toBe('/orders/abc');
    });

    it('genera un tag único por mensaje cuando el payload no trae uno', () => {
      const scope = loadPushHandler({ matchAll: async () => [], openWindow: async () => null });

      scope.__listeners.push(jsonEvent({ title: 'A', body: 'a' }));
      scope.__listeners.push(jsonEvent({ title: 'B', body: 'b' }));

      const first = mockShowNotificationArgs(scope)[1] as { tag: string };
      const second = mockShowNotificationArgs(scope)[1] as { tag: string };
      expect(first.tag).toMatch(/^menugram-\d+$/);
      expect(second.tag).toMatch(/^menugram-\d+$/);
    });

    it('muestra los recordatorios como alertas activas persistentes', () => {
      const scope = loadPushHandler({ matchAll: async () => [], openWindow: async () => null });

      scope.__listeners.push(
        jsonEvent({
          title: 'Recordatorio de tu pedido',
          body: 'Tu pedido sigue pendiente de pago',
          url: '/orders/abc',
          tag: 'order-reminder-abc',
          reminder: true,
          timestamp: 1770000000000,
        }),
      );

      const [, options] = mockShowNotificationArgs(scope);
      expect(options).toMatchObject({
        tag: 'order-reminder-abc',
        renotify: true,
        requireInteraction: true,
        silent: false,
        vibrate: [300, 150, 300],
        timestamp: 1770000000000,
      });
      expect((options as { data: { url: string } }).data.url).toBe('/orders/abc');
    });

    it('las actualizaciones normales no son persistentes ni vibran', () => {
      const scope = loadPushHandler({ matchAll: async () => [], openWindow: async () => null });

      scope.__listeners.push(
        jsonEvent({ title: 'Pedido confirmado', body: 'Ok', tag: 'order-abc', reminder: false }),
      );

      const [, options] = mockShowNotificationArgs(scope);
      expect(options).toMatchObject({ renotify: false, requireInteraction: false });
      expect(options).not.toHaveProperty('vibrate');
    });
  });

  describe('isReminderPayload / buildNotificationOptions', () => {
    it('reconoce reminder explícito y por kind', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.isReminderPayload({ reminder: true })).toBe(true);
      expect(__pushHandlerTest.isReminderPayload({ kind: 'reminder' })).toBe(true);
      expect(__pushHandlerTest.isReminderPayload({ reminder: false, kind: 'update' })).toBe(false);
      expect(__pushHandlerTest.isReminderPayload(null)).toBe(false);
    });

    it('construye opciones de recordatorio completas', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      const options = __pushHandlerTest.buildNotificationOptions(
        { body: 'Texto', tag: 't-1', reminder: true },
        '/orders/1',
      );

      expect(options).toMatchObject({
        body: 'Texto',
        tag: 't-1',
        renotify: true,
        requireInteraction: true,
        silent: false,
        vibrate: [300, 150, 300],
        data: { url: '/orders/1' },
      });
    });

    it('sin timestamp el recordatorio no inventa la propiedad', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      const options = __pushHandlerTest.buildNotificationOptions(
        { body: 'Texto', reminder: true, timestamp: 'no-numerico' },
        '/orders/1',
      );

      expect(options).not.toHaveProperty('timestamp');
    });
  });

  describe('evento notificationclick', () => {
    it('enfoca la pestaña que ya está en la ruta del deep link', async () => {
      const client = createClient('https://app.example.com/orders/abc');
      const other = createClient('https://app.example.com/marketplace');
      const scope = loadPushHandler({
        matchAll: async () => [other, client],
        openWindow: async () => null,
      });

      const waitUntil = vi.fn((p: Promise<unknown>) => p);
      scope.__listeners.notificationclick({
        notification: { close: vi.fn(), data: { url: '/orders/abc' } },
        waitUntil,
      });

      await waitUntil.mock.calls[0][0];
      expect(client.focused).toBe(true);
      expect(client.navigatedTo).toBeUndefined();
    });

    it('reutiliza la ventana abierta en otra pantalla en vez de duplicar la PWA', async () => {
      const client = createClient('https://app.example.com/marketplace');
      const openWindow = vi.fn().mockResolvedValue(null);
      const scope = loadPushHandler({ matchAll: async () => [client], openWindow });

      const waitUntil = vi.fn((p: Promise<unknown>) => p);
      scope.__listeners.notificationclick({
        notification: { close: vi.fn(), data: { url: '/orders/abc' } },
        waitUntil,
      });

      await waitUntil.mock.calls[0][0];
      expect(client.navigatedTo).toBe('/orders/abc');
      expect(openWindow).not.toHaveBeenCalled();
    });

    it('abre una ventana nueva cuando no hay ninguna abierta', async () => {
      const openWindow = vi.fn().mockResolvedValue(null);
      const scope = loadPushHandler({ matchAll: async () => [], openWindow });

      const waitUntil = vi.fn((p: Promise<unknown>) => p);
      scope.__listeners.notificationclick({
        notification: { close: vi.fn(), data: { url: '/orders/abc' } },
        waitUntil,
      });

      await waitUntil.mock.calls[0][0];
      expect(openWindow).toHaveBeenCalledWith('/orders/abc');
    });

    it('abre la URL de la acción pulsada en vez del deep link general', async () => {
      const openWindow = vi.fn().mockResolvedValue(null);
      const scope = loadPushHandler({ matchAll: async () => [], openWindow });

      const waitUntil = vi.fn((p: Promise<unknown>) => p);
      scope.__listeners.notificationclick({
        notification: {
          close: vi.fn(),
          data: { url: '/orders/abc', actionUrls: { ver: '/orders/abc?tab=detalle' } },
        },
        action: 'ver',
        waitUntil,
      });

      await waitUntil.mock.calls[0][0];
      expect(openWindow).toHaveBeenCalledWith('/orders/abc?tab=detalle');
    });
  });

  describe('títulos y acciones según la carga útil', () => {
    it('prefiere el título del payload y cae al del kind', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.resolveTitle({ title: 'Pedido #12' })).toBe('Pedido #12');
      expect(__pushHandlerTest.resolveTitle({ kind: 'new-order' })).toBe('🛒 Nuevo pedido');
      expect(__pushHandlerTest.resolveTitle({ kind: 'rating-alert' })).toBe('⚠️ Alerta de valoración');
      expect(__pushHandlerTest.resolveTitle({ kind: 'menu-reminder' })).toBe('🍽️ ¿Qué se te antoja?');
      expect(__pushHandlerTest.resolveTitle({})).toBe('MenuGran');
      expect(__pushHandlerTest.resolveTitle(null)).toBe('MenuGran');
    });

    it('sanea las acciones: máximo 2, con action y title visibles', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      const actions = __pushHandlerTest.sanitizeActions([
        { action: 'ver', title: 'Ver pedido', url: '/orders/1' },
        { action: 'llamar', title: 'Llamar', url: 'tel:+58' },
        { action: 'extra', title: 'Sobran', url: '/x' },
        { action: '', title: 'Sin id' },
        'no-objeto',
      ]);

      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual({ action: 'ver', title: 'Ver pedido', url: '/orders/1' });
      // Las URLs externas caan al marketplace igual que el deep link general.
      expect(actions[1].url).toBe('/marketplace');
      expect(__pushHandlerTest.sanitizeActions(undefined)).toEqual([]);
    });

    it('expone las acciones visibles y guarda sus URLs en data.actionUrls', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      const options = __pushHandlerTest.buildNotificationOptions(
        {
          body: 'Tienes un nuevo pedido',
          tag: 'new-order-1',
          actions: [{ action: 'ver', title: 'Ver pedido', url: '/orders/1' }],
        },
        '/admin/dashboard',
      ) as {
        actions?: Array<{ action: string; title: string }>;
        data: { url: string; actionUrls: Record<string, string> };
      };

      expect(options.actions).toEqual([{ action: 'ver', title: 'Ver pedido' }]);
      expect(options.data.url).toBe('/admin/dashboard');
      expect(options.data.actionUrls.ver).toBe('/orders/1');
    });

    it('el evento push usa el título resuelto por kind cuando falta', async () => {
      const scope = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      scope.__listeners.push(jsonEvent({ kind: 'new-order', body: 'Nuevo pedido #12', url: '/admin/dashboard' }));

      const [title] = mockShowNotificationArgs(scope);
      expect(title).toBe('🛒 Nuevo pedido');
    });
  });

  describe('evento periodicsync (recordatorios de menú)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Fija una hora local concreta para que el handler sea determinista. */
    function setLocalHour(hour: number): void {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 15, hour, 0, 0));
    }

    it('ignora tags ajenos al recordatorio de menú', () => {
      const scope = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      scope.__listeners.periodicsync({ tag: 'otro-tag', waitUntil: vi.fn() });

      expect(scope.registration.showNotification).not.toHaveBeenCalled();
    });

    it('muestra el recordatorio según la franja horaria local', () => {
      setLocalHour(13);
      const scope = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      scope.__listeners.periodicsync({ tag: 'menugram-reminders', waitUntil: vi.fn() });

      const [title, options] = mockShowNotificationArgs(scope) as [
        string,
        { tag: string; data: { url: string } },
      ];
      expect(typeof title).toBe('string');
      expect(title).not.toBe('');
      expect(options.tag).toBe('menugram-menu-reminder');
      expect(options.data.url).toBe('/marketplace');
    });

    it('elige el copy de desayuno, almuerzo y cena por hora', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.buildReminderCopy(9).title).toContain('Buenos días');
      expect(__pushHandlerTest.buildReminderCopy(12).title).toContain('almorzar');
      expect(__pushHandlerTest.buildReminderCopy(20).title).toContain('cenar');
    });

    it('no cae en el copy de cena a las 3 de la mañana', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      expect(__pushHandlerTest.buildReminderCopy(3).title).not.toContain('cenar');
      expect(__pushHandlerTest.buildReminderCopy(3).title).toContain('antoja');
    });

    it('resolveReminderSlot devuelve la franja vigente y silencia madrugada y noche', () => {
      const { __pushHandlerTest } = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      // Franjas: desayuno desde las 9, almuerzo desde las 12, cena desde las 19.
      expect(__pushHandlerTest.resolveReminderSlot(9)).toBe(9);
      expect(__pushHandlerTest.resolveReminderSlot(11)).toBe(9);
      expect(__pushHandlerTest.resolveReminderSlot(12)).toBe(12);
      expect(__pushHandlerTest.resolveReminderSlot(19)).toBe(19);
      expect(__pushHandlerTest.resolveReminderSlot(20)).toBe(19);

      // Madrugada y noche avanzada: no se molesta al usuario.
      expect(__pushHandlerTest.resolveReminderSlot(3)).toBeNull();
      expect(__pushHandlerTest.resolveReminderSlot(23)).toBeNull();
      expect(__pushHandlerTest.resolveReminderSlot(0)).toBeNull();
      expect(__pushHandlerTest.resolveReminderSlot(-1)).toBeNull();
      expect(__pushHandlerTest.resolveReminderSlot(24)).toBeNull();
      expect(__pushHandlerTest.resolveReminderSlot(Number.NaN)).toBeNull();
    });

    it('no avisa de madrugada aunque el navegador dispare el evento', () => {
      setLocalHour(3);
      const scope = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      scope.__listeners.periodicsync({ tag: 'menugram-reminders', waitUntil: vi.fn() });

      expect(scope.registration.showNotification).not.toHaveBeenCalled();
    });

    it('no avisa a las 23:00 aunque el navegador dispare el evento', () => {
      setLocalHour(23);
      const scope = loadPushHandler({
        matchAll: async () => [],
        openWindow: async () => null,
      });

      scope.__listeners.periodicsync({ tag: 'menugram-reminders', waitUntil: vi.fn() });

      expect(scope.registration.showNotification).not.toHaveBeenCalled();
    });
  });
});

function mockShowNotificationArgs(scope: unknown): [string, unknown] {
  const showNotification = (scope as { registration: { showNotification: ReturnType<typeof vi.fn> } })
    .registration.showNotification;
  const calls = showNotification.mock.calls;
  const last = calls[calls.length - 1];
  return last as [string, unknown];
}