import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useExchangeRate, useBCVRate } from './useExchangeRate';
import type { CachedExchangeRate } from '../services/exchangeRateSupabase';

const getExchangeRateMock = vi.fn<() => Promise<number>>();
const getCachedExchangeRateMock = vi.fn<() => CachedExchangeRate | null>();

vi.mock('../services/exchangeRateSupabase', () => ({
  getExchangeRate: () => getExchangeRateMock(),
  getCachedExchangeRate: () => getCachedExchangeRateMock(),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useExchangeRate', () => {
  beforeEach(() => {
    getExchangeRateMock.mockReset();
    getCachedExchangeRateMock.mockReset().mockReturnValue(null);
  });

  it('carga la tasa desde Supabase al montar', async () => {
    getExchangeRateMock.mockResolvedValue(36.5);
    const { result } = renderHook(() => useExchangeRate());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rate).toBe(36.5);
    expect(result.current.error).toBeNull();
  });

  it('aplica la caché de inmediato y luego la tasa fresca', async () => {
    const cached: CachedExchangeRate = {
      rate: 35,
      timestamp: Date.now(),
      source: 'bcv',
      currency: 'USD',
    };
    getCachedExchangeRateMock.mockReturnValue(cached);
    getExchangeRateMock.mockResolvedValue(36);

    const { result } = renderHook(() => useExchangeRate());

    await waitFor(() => expect(result.current.rate).toBe(35));
    expect(result.current.source).toBe('bcv');

    await waitFor(() => expect(result.current.rate).toBe(36));
    expect(result.current.isLoading).toBe(false);
  });

  it('expone el error del servicio cuando falla con el hook montado', async () => {
    getExchangeRateMock.mockRejectedValue(new Error('fallo de red'));
    const { result } = renderHook(() => useExchangeRate());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('fallo de red');
    expect(result.current.rate).toBeNull();
  });

  it('no actualiza estado si el componente se desmonta antes de resolver', async () => {
    const pending = deferred<number>();
    getExchangeRateMock.mockReturnValue(pending.promise);

    const { unmount } = renderHook(() => useExchangeRate());
    unmount();

    await act(async () => {
      pending.resolve(40);
      await Promise.resolve();
    });
  });

  it('no lanza si el fetch se rechaza tras desmontar el hook', async () => {
    const pending = deferred<number>();
    getExchangeRateMock.mockReturnValue(pending.promise);

    const { unmount } = renderHook(() => useExchangeRate());
    unmount();

    await act(async () => {
      pending.reject(new Error('fallo de red'));
      await Promise.resolve();
    });
  });
});

describe('useBCVRate', () => {
  beforeEach(() => {
    getExchangeRateMock.mockReset();
    getCachedExchangeRateMock.mockReset().mockReturnValue(null);
  });

  it('retorna 0 mientras carga sin caché y la tasa al resolver', async () => {
    getExchangeRateMock.mockResolvedValue(42.25);
    const { result } = renderHook(() => useBCVRate());

    expect(result.current).toBe(0);

    await waitFor(() => expect(result.current).toBe(42.25));
  });
});
