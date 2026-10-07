import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedExchangeRate,
  setCachedExchangeRate,
  getCachedExchangeRateIgnoringTTL,
  clearExchangeRateCache,
  fetchBCVRateFromAPI,
  getBCVRate,
  startHourlyBCVRefresh,
  stopHourlyBCVRefresh,
  refreshBCVRateIfStale,
  EXCHANGE_RATE_TTL_MS,
  EXCHANGE_RATE_REFRESH_INTERVAL_MS,
  DEFAULT_FALLBACK_RATE,
  DOLARVZLA_BCV_URL,
  DOLARVZLA_SOURCE,
} from '../services/exchangeRate';

// Mock localStorage
const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => {
    for (const key of Object.keys(localStorageStore)) {
      delete localStorageStore[key];
    }
  }),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

interface MockFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}

/** Construye una respuesta tipo fetch con cuerpo JSON. */
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}): MockFetchResponse {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: () => Promise.resolve(body),
  };
}

/**
 * Construye un cuerpo con la forma real de
 * `https://rates.dolarvzla.com/bcv/current.json`, incluyendo `previous` y
 * `changePercentage` para que el parser no dependa de un payload recortado.
 */
function dolarVzlaPayload(usd: number | string | null, date: string | null = '2026-10-05') {
  return {
    current: { date, usd, eur: 981.17880877 },
    previous: { date: '2026-10-02', usd: 866.5612, eur: 973.92813268 },
    changePercentage: { usd: 0.5548021305362009, eur: 0.7444775283416522 },
  };
}

describe('exchangeRate service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restaurar implementaciones base del mock de localStorage para evitar
    // filtraciones de mockReturnValue entre tests.
    localStorageMock.getItem.mockImplementation((key: string) => localStorageStore[key] ?? null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => { localStorageStore[key] = value; });
    localStorageMock.removeItem.mockImplementation((key: string) => { delete localStorageStore[key]; });
    localStorageMock.clear.mockImplementation(() => {
      for (const key of Object.keys(localStorageStore)) {
        delete localStorageStore[key];
      }
    });
    localStorageMock.clear();
    clearExchangeRateCache();
    stopHourlyBCVRefresh();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('getCachedExchangeRate', () => {
    it('returns null when localStorage is empty', () => {
      const result = getCachedExchangeRate();
      expect(result).toBeNull();
    });

    it('returns cached rate when within TTL', () => {
      const cachedData = {
        rate: 36.5,
        timestamp: Date.now(),
        source: 'test',
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const result = getCachedExchangeRate();
      expect(result).toEqual(cachedData);
    });

    it('returns null when cache is expired', () => {
      const expiredData = {
        rate: 36.5,
        timestamp: Date.now() - EXCHANGE_RATE_TTL_MS - 1000,
        source: 'test',
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));

      const result = getCachedExchangeRate();
      expect(result).toBeNull();
    });

    it('handles malformed JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = getCachedExchangeRate();
      expect(result).toBeNull();
    });

    it('returns null when rate is not positive', () => {
      const badData = {
        rate: 0,
        timestamp: Date.now(),
        source: 'test',
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(badData));

      const result = getCachedExchangeRate();
      expect(result).toBeNull();
    });
  });

  describe('setCachedExchangeRate', () => {
    it('stores rate with current timestamp and source', () => {
      setCachedExchangeRate(37.2, 'test-api');

      // Verify the call was made with the correct key and value
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const [key, value] = localStorageMock.setItem.mock.calls[0];
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      expect(value).toContain('"rate":37.2');
      expect(value).toContain('"source":"test-api"');
    });
  });

  describe('getCachedExchangeRateIgnoringTTL', () => {
    it('returns expired cache when TTL is ignored', () => {
      const expiredTimestamp = 1000000000000; // Fixed timestamp
      const expiredData = {
        rate: 35.0,
        timestamp: expiredTimestamp,
        source: 'old-api',
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));

      const result = getCachedExchangeRateIgnoringTTL();
      expect(result).toEqual(expiredData);
    });

    it('returns null for invalid rate', () => {
      const badData = { rate: -1, timestamp: Date.now(), source: 'test' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(badData));

      const result = getCachedExchangeRateIgnoringTTL();
      expect(result).toBeNull();
    });
  });

  describe('fetchBCVRateFromAPI', () => {
    const PRIMARY_BCV_ENDPOINT = DOLARVZLA_BCV_URL;

    it('consulta el endpoint de DolarVZLA y extrae current.usd', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(dolarVzlaPayload(871.3689)),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchBCVRateFromAPI();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(PRIMARY_BCV_ENDPOINT, expect.objectContaining({
        headers: { Accept: 'application/json' },
      }));
      expect(result.rate).toBe(871.3689);
      expect(result.source).toBe(DOLARVZLA_SOURCE);
    });

    it('lee la fecha de la tasa desde current.date', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(dolarVzlaPayload(871.3689, '2026-10-05')),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchBCVRateFromAPI();

      expect(result.rateDate).toBe('2026-10-05');
    });

    it('ignora eur, previous y changePercentage al calcular la tasa', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          current: { date: '2026-10-05', usd: 871.3689, eur: 981.17880877 },
          previous: { date: '2026-10-02', usd: 866.5612, eur: 973.92813268 },
          changePercentage: { usd: 0.5548021305362009, eur: 0.7444775283416522 },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchBCVRateFromAPI();

      expect(result.rate).toBe(871.3689);
    });

    it('acepta current.usd numérico como string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dolarVzlaPayload('905.25')));
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchBCVRateFromAPI();

      expect(result.rate).toBe(905.25);
    });

    it('exige un current.usd válido y cae al siguiente endpoint', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(jsonResponse({ current: { usd: null }, compra: 850, venta: 860 }))
        .mockResolvedValueOnce(jsonResponse({ promedio: 858.1 }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchBCVRateFromAPI();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe(PRIMARY_BCV_ENDPOINT);
      expect(result.rate).toBe(858.1);
      expect(result.source).toBe('ve.dolarapi.com/oficial');
    });

    it('hace fallback al siguiente endpoint si la red devuelve error HTTP', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 404, statusText: 'Not Found' }))
        .mockResolvedValueOnce(jsonResponse({ promedio: 800.5 }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchBCVRateFromAPI();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe(PRIMARY_BCV_ENDPOINT);
      expect(result.rate).toBe(800.5);
    });

    it('rechaza cuando todos los endpoints fallan', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network down'));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchBCVRateFromAPI()).rejects.toThrow('Network down');
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it('rechaza cuando current.usd es inválido en todos los endpoints', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dolarVzlaPayload(-1)));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchBCVRateFromAPI()).rejects.toThrow(/Tasa inválida/);
    });

    it('deduplica llamadas concurrentes en un único fetch', async () => {
      let resolveFetch: (value: MockFetchResponse) => void = () => {};
      const fetchMock = vi.fn().mockImplementation(
        () => new Promise<MockFetchResponse>((resolve) => { resolveFetch = resolve; }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const firstCall = fetchBCVRateFromAPI();
      const secondCall = fetchBCVRateFromAPI();
      resolveFetch(jsonResponse(dolarVzlaPayload(860.5)));

      const [first, second] = await Promise.all([firstCall, secondCall]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(first.rate).toBe(860.5);
      expect(second.rate).toBe(860.5);
    });

    it('permite un nuevo fetch después de que falla uno previo', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Sin conexión'));
      vi.stubGlobal('fetch', fetchMock);

      // El primer intento falla en todos los endpoints (5 fetch rechazados).
      await expect(fetchBCVRateFromAPI()).rejects.toThrow('Sin conexión');
      expect(fetchMock).toHaveBeenCalledTimes(5);

      // Tras la falla, una nueva llamada debe poder consultar la API.
      fetchMock.mockResolvedValue(jsonResponse(dolarVzlaPayload(870)));
      const result = await fetchBCVRateFromAPI();
      expect(result.rate).toBe(870);
    });
  });

  describe('getBCVRate', () => {
    it('retorna la tasa fresca de la API y la guarda en caché', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dolarVzlaPayload(859.9)));
      vi.stubGlobal('fetch', fetchMock);

      const rate = await getBCVRate();

      expect(rate).toBe(859.9);
      expect(getCachedExchangeRate()?.rate).toBe(859.9);
    });

    it('conserva la fecha de la tasa al guardarla en caché', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(dolarVzlaPayload(859.9, '2026-10-05')),
      );
      vi.stubGlobal('fetch', fetchMock);

      await getBCVRate();

      expect(getCachedExchangeRate()?.rateDate).toBe('2026-10-05');
    });

    it('usa la caché válida sin llamar a la API', async () => {
      setCachedExchangeRate(123.45, 'test');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const rate = await getBCVRate();

      expect(rate).toBe(123.45);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('usa la última tasa en caché (aunque expirada) si la API falla', async () => {
      setCachedExchangeRate(777.77, 'test');
      vi.advanceTimersByTime(EXCHANGE_RATE_TTL_MS + 1000);
      const fetchMock = vi.fn().mockRejectedValue(new Error('Sin conexión'));
      vi.stubGlobal('fetch', fetchMock);

      const rate = await getBCVRate();

      expect(rate).toBe(777.77);
    });

    it('retorna la tasa en caché si tiene menos de 1 hora de antigüedad', async () => {
      setCachedExchangeRate(500.0, 'test');
      vi.advanceTimersByTime(EXCHANGE_RATE_TTL_MS - 5 * 60 * 1000); // 55 minutos
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const rate = await getBCVRate();

      expect(rate).toBe(500.0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('vuelve a consultar la API cuando la caché supera la hora', async () => {
      setCachedExchangeRate(500.0, 'test');
      vi.advanceTimersByTime(EXCHANGE_RATE_TTL_MS + 1000);
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dolarVzlaPayload(871.36)));
      vi.stubGlobal('fetch', fetchMock);

      const rate = await getBCVRate();

      expect(rate).toBe(871.36);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retorna la tasa por defecto cuando no hay caché y la API falla', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Sin conexión'));
      vi.stubGlobal('fetch', fetchMock);

      const rate = await getBCVRate();

      expect(rate).toBe(DEFAULT_FALLBACK_RATE);
    });
  });

  describe('startHourlyBCVRefresh', () => {
    it('consulta la API al iniciar y repite cada hora', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dolarVzlaPayload(871)));
      vi.stubGlobal('fetch', fetchMock);

      startHourlyBCVRefresh();
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getCachedExchangeRate()?.rate).toBe(871);

      fetchMock.mockResolvedValue(jsonResponse(dolarVzlaPayload(872)));
      await vi.advanceTimersByTimeAsync(EXCHANGE_RATE_REFRESH_INTERVAL_MS);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(getCachedExchangeRate()?.rate).toBe(872);
    });

    it('no registra un segundo intervalo si ya está activo', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dolarVzlaPayload(871)));
      vi.stubGlobal('fetch', fetchMock);

      startHourlyBCVRefresh();
      startHourlyBCVRefresh();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(EXCHANGE_RATE_REFRESH_INTERVAL_MS);

      // 1 consulta inmediata + 1 del intervalo único: sin duplicación.
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('conserva la caché existente si la API falla durante el refresco', async () => {
      setCachedExchangeRate(870.5, 'test');
      const fetchMock = vi.fn().mockRejectedValue(new Error('Sin conexión'));
      vi.stubGlobal('fetch', fetchMock);

      startHourlyBCVRefresh();
      await vi.advanceTimersByTimeAsync(EXCHANGE_RATE_REFRESH_INTERVAL_MS);

      expect(getCachedExchangeRateIgnoringTTL()?.rate).toBe(870.5);
    });

    it('stopHourlyBCVRefresh detiene el intervalo', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dolarVzlaPayload(871)));
      vi.stubGlobal('fetch', fetchMock);

      startHourlyBCVRefresh();
      await vi.advanceTimersByTimeAsync(0);
      stopHourlyBCVRefresh();
      await vi.advanceTimersByTimeAsync(EXCHANGE_RATE_REFRESH_INTERVAL_MS);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshBCVRateIfStale', () => {
    it('no consulta la API si la caché sigue vigente', async () => {
      setCachedExchangeRate(500, 'test');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await refreshBCVRateIfStale();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('consulta la API al recuperar el foco si la caché expiró', async () => {
      setCachedExchangeRate(500, 'test');
      vi.advanceTimersByTime(EXCHANGE_RATE_TTL_MS + 1000);
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dolarVzlaPayload(871)));
      vi.stubGlobal('fetch', fetchMock);

      await refreshBCVRateIfStale();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getCachedExchangeRate()?.rate).toBe(871);
    });

    it('falla en silencio si la API no responde', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Sin conexión'));
      vi.stubGlobal('fetch', fetchMock);

      await expect(refreshBCVRateIfStale()).resolves.toBeUndefined();
    });
  });

  describe('formatVES', () => {
    it('formats Venezuelan Bolívares correctly', async () => {
      const { formatVES } = await import('../services/exchangeRate');
      const formatted = formatVES(1234.56);
      expect(formatted).toContain('Bs.');
      expect(formatted).toContain('1.234,56'); // Formato venezolano
    });

    it('handles zero amount', async () => {
      const { formatVES } = await import('../services/exchangeRate');
      const formatted = formatVES(0);
      expect(formatted).toContain('0,00');
    });
  });

  describe('formatUSD', () => {
    it('formats USD correctly', async () => {
      const { formatUSD } = await import('../services/exchangeRate');
      const formatted = formatUSD(10.5);
      // es-VE locale formats as "USD 10,50" not "$10.50"
      expect(formatted).toContain('USD');
      expect(formatted).toContain('10,50');
    });
  });
});
