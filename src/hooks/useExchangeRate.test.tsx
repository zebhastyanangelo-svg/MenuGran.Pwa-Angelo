import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useExchangeRate, useBCVRate } from './useExchangeRate';
import type { ExchangeRateData } from '../services/exchangeRate';

const getBCVRateMock = vi.fn<() => Promise<number>>();
const getCachedExchangeRateMock = vi.fn<() => ExchangeRateData | null>();

vi.mock('../services/exchangeRate', () => ({
  getBCVRate: () => getBCVRateMock(),
  getCachedExchangeRate: () => getCachedExchangeRateMock(),
  EXCHANGE_RATE_REFRESH_INTERVAL_MS: 5 * 60 * 1000,
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
    getBCVRateMock.mockReset();
    getCachedExchangeRateMock.mockReset().mockReturnValue(null);
  });

  it('carga la tasa desde la API al montar', async () => {
    getBCVRateMock.mockResolvedValue(857.5);
    const { result } = renderHook(() => useExchangeRate());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rate).toBe(857.5);
    expect(result.current.error).toBeNull();
  });

  it('aplica la caché de inmediato y luego la tasa fresca', async () => {
    const cached: ExchangeRateData = {
      rate: 855,
      timestamp: Date.now(),
      source: 'dolarapi.com/venezuela/bcv',
    };
    getCachedExchangeRateMock.mockReturnValue(cached);
    getBCVRateMock.mockResolvedValue(858);

    const { result } = renderHook(() => useExchangeRate());

    await waitFor(() => expect(result.current.rate).toBe(855));
    expect(result.current.source).toBe('dolarapi.com/venezuela/bcv');

    await waitFor(() => expect(result.current.rate).toBe(858));
    expect(result.current.isLoading).toBe(false);
  });

  it('expone el error del servicio cuando falla con el hook montado', async () => {
    getBCVRateMock.mockRejectedValue(new Error('fallo de red'));
    const { result } = renderHook(() => useExchangeRate());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('fallo de red');
    expect(result.current.rate).toBeNull();
  });

  it('no actualiza estado si el componente se desmonta antes de resolver', async () => {
    const pending = deferred<number>();
    getBCVRateMock.mockReturnValue(pending.promise);

    const { unmount } = renderHook(() => useExchangeRate());
    unmount();

    await act(async () => {
      pending.resolve(40);
      await Promise.resolve();
    });
  });

  it('no lanza si el fetch se rechaza tras desmontar el hook', async () => {
    const pending = deferred<number>();
    getBCVRateMock.mockReturnValue(pending.promise);

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
    getBCVRateMock.mockReset();
    getCachedExchangeRateMock.mockReset().mockReturnValue(null);
  });

  it('retorna 0 mientras carga sin caché y la tasa al resolver', async () => {
    getBCVRateMock.mockResolvedValue(859.25);
    const { result } = renderHook(() => useBCVRate());

    expect(result.current).toBe(0);

    await waitFor(() => expect(result.current).toBe(859.25));
  });
});
