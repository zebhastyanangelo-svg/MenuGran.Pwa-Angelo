import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePushSubscriptionSync } from './usePushSubscriptionSync';

const pushMocks = vi.hoisted(() => ({
  reconcilePushSubscription: vi.fn(),
}));

vi.mock('../services/pushNotificationService', () => ({
  reconcilePushSubscription: pushMocks.reconcilePushSubscription,
}));

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('./useAuth', () => ({
  useAuth: authMocks.useAuth,
}));

/** Stub del registro del SW que permite disparar `updatefound` a mano. */
interface RegistrationStub {
  listeners: Map<string, () => void>;
  addEventListener: (type: string, handler: () => void) => void;
  removeEventListener: (type: string, handler: () => void) => void;
  emit: (type: string) => void;
}

function installServiceWorker(): RegistrationStub {
  const stub: RegistrationStub = {
    listeners: new Map(),
    addEventListener(type, handler) {
      stub.listeners.set(type, handler);
    },
    removeEventListener(type) {
      stub.listeners.delete(type);
    },
    emit(type) {
      stub.listeners.get(type)?.();
    },
  };

  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve(stub) },
    configurable: true,
  });

  return stub;
}

function mockUser(overrides: Record<string, unknown> = {}): void {
  authMocks.useAuth.mockReturnValue({
    user: { id: 'user-1' },
    profile: { role: 'customer' },
    isLoading: false,
    ...overrides,
  });
}

/** Marca el documento como visible u oculto para disparar `visibilitychange`. */
function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
}

function fireVisibilityChange(): void {
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('usePushSubscriptionSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    pushMocks.reconcilePushSubscription.mockResolvedValue({ status: 'synced' });
    mockUser();
    setDocumentHidden(false);
    installServiceWorker();
  });

  afterEach(() => {
    vi.useRealTimers();
    setDocumentHidden(false);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });
  });

  it('reconcilia la suscripción al montar con usuario autenticado', async () => {
    await act(async () => {
      renderHook(() => usePushSubscriptionSync());
    });

    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledTimes(1);
    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledWith('user-1', 'customer');
  });

  it('no reconcilia sin usuario autenticado', async () => {
    mockUser({ user: null, profile: null });

    await act(async () => {
      renderHook(() => usePushSubscriptionSync());
    });

    expect(pushMocks.reconcilePushSubscription).not.toHaveBeenCalled();
  });

  it('reconcilia una sola vez por montaje aunque el hook se re-renderice', async () => {
    const { rerender } = renderHook(() => usePushSubscriptionSync());

    await act(async () => {
      rerender();
      rerender();
    });

    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledTimes(1);
  });

  it('reconcilia de nuevo cuando el service worker se actualiza', async () => {
    const registration = installServiceWorker();

    await act(async () => {
      renderHook(() => usePushSubscriptionSync());
    });
    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledTimes(1);

    // Un bundle nuevo puede traer otra clave VAPID pública: hay que renovarla.
    await act(async () => {
      registration.emit('updatefound');
    });

    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledTimes(2);
  });

  it('no vuelve a reconciliar por visibilidad dentro de la ventana de espera', async () => {
    await act(async () => {
      renderHook(() => usePushSubscriptionSync());
    });

    // Pocos minutos después: dentro del throttle, no se repite la llamada.
    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      setDocumentHidden(true);
    });
    fireVisibilityChange();

    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledTimes(1);
  });

  it('reconcilia al volver a la pestaña pasado el intervalo de revalidación', async () => {
    await act(async () => {
      renderHook(() => usePushSubscriptionSync());
    });

    await act(async () => {
      vi.advanceTimersByTime(16 * 60 * 1000);
    });
    fireVisibilityChange();

    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledTimes(2);
    expect(pushMocks.reconcilePushSubscription).toHaveBeenLastCalledWith('user-1', 'customer');
  });

  it('no reconcilia si la pestaña sigue oculta', async () => {
    await act(async () => {
      renderHook(() => usePushSubscriptionSync());
    });

    await act(async () => {
      vi.advanceTimersByTime(16 * 60 * 1000);
      setDocumentHidden(true);
    });
    fireVisibilityChange();

    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledTimes(1);
  });

  it('sigue funcionando cuando el navegador no expone serviceWorker', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });

    await act(async () => {
      renderHook(() => usePushSubscriptionSync());
    });

    expect(pushMocks.reconcilePushSubscription).toHaveBeenCalledTimes(1);
  });
});