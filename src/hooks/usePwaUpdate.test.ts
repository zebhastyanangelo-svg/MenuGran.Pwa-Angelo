import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePwaInstall, usePwaUpdate } from '../hooks/usePwaUpdate';

function createMockRegistration(overrides: Partial<ServiceWorkerRegistration> = {}) {
  return {
    active: { state: 'activated' } as ServiceWorker,
    waiting: null,
    installing: null,
    scope: '/',
    update: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  } as unknown as ServiceWorkerRegistration;
}

function stubServiceWorker(registration: ServiceWorkerRegistration | undefined) {
  const mock = {
    register: vi.fn().mockResolvedValue(registration),
    getRegistration: vi.fn().mockResolvedValue(registration),
    ready: Promise.resolve(registration ?? createMockRegistration()),
    controller: null as ServiceWorker | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    oncontrollerchange: null,
    onmessage: null,
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    value: mock,
    configurable: true,
    writable: true,
  });
}

describe('usePwaUpdate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expone flags en false cuando no hay actualizaciones', () => {
    const { result } = renderHook(() => usePwaUpdate());

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.isOfflineReady).toBe(false);
  });

  it('expone el alias isUpdateAvailable correctamente', () => {
    const { result } = renderHook(() => usePwaUpdate());

    expect(result.current.isUpdateAvailable).toEqual(result.current.needRefresh);
    expect(result.current.isOfflineReady).toEqual(result.current.offlineReady);
  });

  it('closePrompt apaga needRefresh y offlineReady', async () => {
    const { result } = renderHook(() => usePwaUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('pwa:need-refresh'));
    });
    act(() => {
      window.dispatchEvent(new CustomEvent('pwa:offline-ready'));
    });

    await act(async () => {
      result.current.closePrompt();
    });

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.isOfflineReady).toBe(false);
  });

  it('activa needRefresh al recibir el evento pwa:need-refresh', () => {
    const { result } = renderHook(() => usePwaUpdate());

    expect(result.current.isUpdateAvailable).toBe(false);

    act(() => {
      window.dispatchEvent(new CustomEvent('pwa:need-refresh'));
    });

    expect(result.current.isUpdateAvailable).toBe(true);
  });

  it('activa offlineReady al recibir el evento pwa:offline-ready', () => {
    const { result } = renderHook(() => usePwaUpdate());

    expect(result.current.isOfflineReady).toBe(false);

    act(() => {
      window.dispatchEvent(new CustomEvent('pwa:offline-ready'));
    });

    expect(result.current.isOfflineReady).toBe(true);
  });

  it('llama al callback onNeedRefresh cuando se dispara el evento', () => {
    const onNeedRefresh = vi.fn();
    renderHook(() => usePwaUpdate({ onNeedRefresh }));

    act(() => {
      window.dispatchEvent(new CustomEvent('pwa:need-refresh'));
    });

    expect(onNeedRefresh).toHaveBeenCalledTimes(1);
  });

  it('llama al callback onOfflineReady cuando se dispara el evento', () => {
    const onOfflineReady = vi.fn();
    renderHook(() => usePwaUpdate({ onOfflineReady }));

    act(() => {
      window.dispatchEvent(new CustomEvent('pwa:offline-ready'));
    });

    expect(onOfflineReady).toHaveBeenCalledTimes(1);
  });

  it('updateServiceWorker envía SKIP_WAITING cuando hay un SW en espera', async () => {
    const waitingPostMessage = vi.fn();
    const waitingSW = { postMessage: waitingPostMessage } as unknown as ServiceWorker;
    const registration = createMockRegistration({ waiting: waitingSW });
    stubServiceWorker(registration);

    const { result } = renderHook(() => usePwaUpdate());

    await act(async () => {
      await result.current.updateServiceWorker(false);
    });

    expect(waitingPostMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('updateServiceWorker es no-op cuando no hay Service Worker disponible', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => usePwaUpdate());

    await expect(
      act(async () => {
        await result.current.updateServiceWorker(false);
      }),
    ).resolves.not.toThrow();
  });

  it('updateServiceWorker completa sin error cuando no hay SW en espera', async () => {
    const registration = createMockRegistration();
    stubServiceWorker(registration);

    const { result } = renderHook(() => usePwaUpdate());

    await expect(
      act(async () => {
        await result.current.updateServiceWorker(false);
      }),
    ).resolves.not.toThrow();
  });

  it('limpia los event listeners al desmontar', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => usePwaUpdate());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      'pwa:need-refresh',
      expect.any(Function),
    );
    expect(removeSpy).toHaveBeenCalledWith(
      'pwa:offline-ready',
      expect.any(Function),
    );
  });

  it('acepta callbacks opcionales sin romper', () => {
    const onNeedRefresh = vi.fn();
    const onOfflineReady = vi.fn();

    expect(() =>
      renderHook(() =>
        usePwaUpdate({ onNeedRefresh, onOfflineReady }),
      ),
    ).not.toThrow();
  });
});

describe('usePwaInstall', () => {
  it('expone canInstall false e isInstalled false al inicio', () => {
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('activa canInstall al recibir el evento beforeinstallprompt', () => {
    const { result } = renderHook(() => usePwaInstall());

    const fakeEvent = new Event('beforeinstallprompt');
    Object.defineProperty(fakeEvent, 'prompt', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
    });
    Object.defineProperty(fakeEvent, 'userChoice', {
      value: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('promptInstall delega en el evento nativo y apaga canInstall', async () => {
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePwaInstall());

    const fakeEvent = new Event('beforeinstallprompt');
    Object.defineProperty(fakeEvent, 'prompt', {
      value: promptMock,
      configurable: true,
    });
    Object.defineProperty(fakeEvent, 'userChoice', {
      value: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(result.current.canInstall).toBe(false);
  });

  it('promptInstall es no-op sin evento de instalación', async () => {
    const { result } = renderHook(() => usePwaInstall());

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('marca isInstalled al recibir el evento appinstalled', () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
  });
});
