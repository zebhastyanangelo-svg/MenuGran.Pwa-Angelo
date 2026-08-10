import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mockear el módulo virtual virtual:pwa-register/react antes de importar el hook
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn().mockReturnValue({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { usePwaInstall, usePwaUpdate } from '../hooks/usePwaUpdate';

describe('usePwaUpdate', () => {
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

    await act(async () => {
      result.current.closePrompt();
    });

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.isOfflineReady).toBe(false);
  });

  it('updateServiceWorker delega en el virtual module', async () => {
    const { result } = renderHook(() => usePwaUpdate());

    await act(async () => {
      await result.current.updateServiceWorker(true);
    });

    const updateSW = result.current.updateServiceWorker;
    expect(updateSW).toBeDefined();
    expect(typeof updateSW).toBe('function');
  });

  it('acepta callbacks opcionales sin romper', () => {
    const onRegistered = vi.fn();
    const onRegisterError = vi.fn();
    const onOfflineReady = vi.fn();

    expect(() =>
      renderHook(() =>
        usePwaUpdate({ onRegistered, onRegisterError, onOfflineReady }),
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