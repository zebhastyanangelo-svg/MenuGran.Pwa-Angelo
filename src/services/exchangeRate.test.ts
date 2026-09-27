import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedExchangeRate,
  setCachedExchangeRate,
  getCachedExchangeRateIgnoringTTL,
  EXCHANGE_RATE_TTL_MS,
} from '../services/exchangeRate';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('exchangeRate service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
        timestamp: Date.now() - EXCHANGE_RATE_TTL_MS - 1000, // 1 segundo más de 4 horas
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