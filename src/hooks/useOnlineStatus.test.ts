import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function stubOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
    writable: true,
  });
}

describe('useOnlineStatus', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    stubOnLine(true);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    stubOnLine(originalOnLine);
  });

  it('inicia en línea cuando navigator.onLine es true', () => {
    stubOnLine(true);

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('inicia sin línea cuando navigator.onLine es false', () => {
    stubOnLine(false);

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('cambia a offline al dispararse el evento "offline"', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('cambia a online al dispararse el evento "online"', () => {
    stubOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('re-evalúa navigator.onLine al volver a montar el hook', () => {
    stubOnLine(true);
    const first = renderHook(() => useOnlineStatus());
    expect(first.result.current.isOnline).toBe(true);
    first.unmount();

    stubOnLine(false);
    const second = renderHook(() => useOnlineStatus());
    expect(second.result.current.isOnline).toBe(false);
    second.unmount();
  });

  it('registra y limpia los listeners de window', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('mantiene el estado estable ante múltiples disparos del mismo evento', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOffline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOffline).toBe(true);
    expect(result.current.isOnline).toBe(false);
  });
});

