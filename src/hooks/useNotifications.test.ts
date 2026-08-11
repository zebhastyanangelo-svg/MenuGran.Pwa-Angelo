import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications, buildOrderNotification } from '../hooks/useNotifications';
import type { OrderStatus } from '../types/database';

const mockNotificationInstance = {
  close: vi.fn(),
};

let mockPermission: string;
let mockRequestPermission: ReturnType<typeof vi.fn>;

function setupNotificationMock() {
  mockPermission = 'default';
  mockRequestPermission = vi.fn().mockResolvedValue('granted');

  const MockNotification = vi.fn(() => mockNotificationInstance) as any;
  MockNotification.permission = mockPermission;
  MockNotification.requestPermission = mockRequestPermission;

  (globalThis as any).Notification = MockNotification;
}

beforeEach(() => {
  vi.clearAllMocks();
  setupNotificationMock();
});

afterEach(() => {
  delete (globalThis as any).Notification;
});

describe('buildOrderNotification', () => {
  it('construye la notificación correcta para cada estado de orden', () => {
    const statuses: OrderStatus[] = [
      'payment_pending',
      'confirmed',
      'preparing',
      'ready',
      'on_the_way',
      'delivered',
      'cancelled',
    ];

    statuses.forEach((status) => {
      const notification = buildOrderNotification(status);

      expect(notification.title).toBeTypeOf('string');
      expect(notification.title.length).toBeGreaterThan(0);
      expect(notification.body).toBeTypeOf('string');
      expect(notification.body.length).toBeGreaterThan(0);
      expect(notification.tag).toBe('order-status-update');
      expect(notification.data).toEqual({ status });
    });
  });

  it('incluye el estado en los datos de la notificación', () => {
    const notification = buildOrderNotification('preparing');
    expect(notification.data).toEqual({ status: 'preparing' });
  });
});

describe('useNotifications', () => {
  it('inicia con permission "default" y isSupported true cuando Notification está disponible', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permission).toBe('default');
    expect(result.current.isSupported).toBe(true);
  });

  it('inicia con isSupported false cuando Notification no está disponible', () => {
    delete (globalThis as any).Notification;

    const { result } = renderHook(() => useNotifications());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.permission).toBe('default');
  });

  it('requestPermission solicita permiso y actualiza el estado', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('requestPermission retorna "default" cuando no es soportado', async () => {
    delete (globalThis as any).Notification;

    const { result } = renderHook(() => useNotifications());

    let resolvedPermission = 'initial';
    await act(async () => {
      resolvedPermission = await result.current.requestPermission();
    });

    expect(resolvedPermission).toBe('default');
  });

  it('showNotification no crea instancia cuando permission es "denied"', () => {
    (globalThis as any).Notification.permission = 'denied';

    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.showNotification({
        title: 'Test',
        body: 'mensaje de prueba',
      });
    });

    expect((globalThis as any).Notification).not.toHaveBeenCalled();
  });

  it('showNotification no crea instancia cuando permission es "default"', () => {
    (globalThis as any).Notification.permission = 'default';

    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.showNotification({
        title: 'Test',
        body: 'mensaje de prueba',
      });
    });

    expect((globalThis as any).Notification).not.toHaveBeenCalled();
  });

  it('showNotification crea instancia cuando permission es "granted"', async () => {
    (globalThis as any).Notification.permission = 'granted';

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(result.current.permission).toBe('granted');

    act(() => {
      result.current.showNotification({
        title: 'Pedido confirmado',
        body: 'El comercio ha confirmado tu pedido.',
        tag: 'order-status-update',
        data: { status: 'confirmed' },
      });
    });

    expect((globalThis as any).Notification).toHaveBeenCalledTimes(1);
    expect((globalThis as any).Notification).toHaveBeenCalledWith(
      'Pedido confirmado',
      expect.objectContaining({
        body: 'El comercio ha confirmado tu pedido.',
        tag: 'order-status-update',
        data: { status: 'confirmed' },
      }),
    );
  });

  it('showNotification llama a Notification cada vez que se invoca con permission granted', () => {
    (globalThis as any).Notification.permission = 'granted';
    (globalThis as any).Notification.mockClear();

    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.showNotification({
        title: 'Test 1',
        body: 'mensaje 1',
      });
    });

    act(() => {
      result.current.showNotification({
        title: 'Test 2',
        body: 'mensaje 2',
      });
    });

    expect((globalThis as any).Notification).toHaveBeenCalledTimes(2);
  });

  it('showNotification no hace nada cuando no es soportado', () => {
    delete (globalThis as any).Notification;

    const { result } = renderHook(() => useNotifications());

    expect(() => {
      result.current.showNotification({
        title: 'Test',
        body: 'mensaje',
      });
    }).not.toThrow();
  });

  it('no dispara notificación duplicada para el mismo estado', () => {
    (globalThis as any).Notification.permission = 'granted';
    (globalThis as any).Notification.mockClear();

    const { result } = renderHook(() => useNotifications());

    act(() => {
      void result.current.requestPermission();
    });

    const notification = buildOrderNotification('confirmed');

    act(() => {
      result.current.showNotification(notification);
    });

    act(() => {
      result.current.showNotification(notification);
    });

    expect((globalThis as any).Notification).toHaveBeenCalledTimes(2);
  });

  it('showNotification no hace nada cuando permission sigue en "default" tras requestPermission fallida', async () => {
    mockRequestPermission = vi.fn().mockRejectedValue(new Error('denied'));
    (globalThis as any).Notification.requestPermission = mockRequestPermission;

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(result.current.permission).toBe('default');

    act(() => {
      result.current.showNotification({
        title: 'Test',
        body: 'mensaje',
      });
    });

    expect((globalThis as any).Notification).not.toHaveBeenCalled();
  });

  it('requestPermission captura errores y retorna "default"', async () => {
    mockRequestPermission = vi.fn().mockRejectedValue(new Error('Permission denied'));
    (globalThis as any).Notification.requestPermission = mockRequestPermission;

    const { result } = renderHook(() => useNotifications());

    let resolvedPermission = 'initial';
    await act(async () => {
      resolvedPermission = await result.current.requestPermission();
    });

    expect(resolvedPermission).toBe('default');
  });

  it('showNotification captura errores silenciosamente', async () => {
    (globalThis as any).Notification.permission = 'granted';
    (globalThis as any).Notification.mockImplementation(() => {
      throw new Error('Notification error');
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(() => {
      act(() => {
        result.current.showNotification({
          title: 'Test',
          body: 'mensaje',
        });
      });
    }).not.toThrow();
  });
});
