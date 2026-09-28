/**
 * Servicio para obtener y cachear la tasa de cambio oficial BCV (Banco Central de Venezuela).
 * La tasa se consulta desde una API pública y se guarda en localStorage con TTL de 4 horas.
 */

export const EXCHANGE_RATE_STORAGE_KEY = 'menugram_bcv_exchange_rate';
export const EXCHANGE_RATE_TTL_MS = 60 * 60 * 1000; // 1 hora en milisegundos (actualización cada hora)

export interface ExchangeRateData {
  rate: number;
  timestamp: number;
  source: string;
}

export interface BCVRateResponse {
  price: number;
  date: string;
  source: string;
}

/**
 * APIs públicas para obtener la tasa BCV oficial.
 * Se intenta en orden hasta que una responda correctamente.
 */
const BCV_API_ENDPOINTS = [
  {
    url: 'https://ve.dolarapi.com/v1/dolares/oficial',
    parser: (data: { precio: number; fecha: string }) => ({
      price: data.precio,
      date: data.fecha,
      source: 'dolarapi.com',
    }),
  },
  {
    url: 'https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv',
    parser: (data: any) => {
      const rateCandidate = data.price ?? data.promedio ?? data.monto ?? data.bcv?.price ?? data.bcv?.promedio ?? data.bcv?.monto;
      const dateCandidate = data.date ?? data.fecha ?? data.bcv?.date ?? data.bcv?.fecha;
      const price = typeof rateCandidate === 'number' ? rateCandidate : typeof rateCandidate === 'string' ? parseFloat(rateCandidate) : NaN;
      const date = typeof dateCandidate === 'string' ? dateCandidate : new Date().toISOString();
      if (Number.isNaN(price) || price <= 0) {
        throw new Error('Tasa inválida recibida de pydolarvenezuela-api');
      }
      return { price, date, source: 'pydolarvenezuela-api.vercel.app' };
    },
  },
  {
    url: 'https://bcv-api.vercel.app/api/bcv',
    parser: (data: any) => {
      const rateCandidate = data.price ?? data.rate ?? data.bcv?.price ?? data.bcv?.rate;
      const dateCandidate = data.date ?? data.fecha ?? data.bcv?.date ?? data.bcv?.fecha;
      const price = typeof rateCandidate === 'number' ? rateCandidate : typeof rateCandidate === 'string' ? parseFloat(rateCandidate) : NaN;
      const date = typeof dateCandidate === 'string' ? dateCandidate : new Date().toISOString();
      if (Number.isNaN(price) || price <= 0) {
        throw new Error('Tasa inválida recibida de bcv-api');
      }
      return { price, date, source: 'bcv-api.vercel.app' };
    },
  },
];

/**
 * Obtiene la tasa BCV desde localStorage si es válida (menos de 4 horas).
 */
export function getCachedExchangeRate(): ExchangeRateData | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as ExchangeRateData;
    const now = Date.now();

    if (now - parsed.timestamp < EXCHANGE_RATE_TTL_MS && parsed.rate > 0) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Guarda la tasa BCV en localStorage con timestamp actual.
 */
export function setCachedExchangeRate(rate: number, source: string): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const data: ExchangeRateData = {
      rate,
      timestamp: Date.now(),
      source,
    };
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar errores de localStorage (cuota excedida, modo privado, etc.)
  }
}

/**
 * Consulta la tasa BCV desde las APIs públicas disponibles.
 * Intenta cada endpoint hasta que uno responda correctamente.
 */
export async function fetchBCVRateFromAPI(): Promise<ExchangeRateData> {
  let lastError: Error | null = null;

  for (const endpoint of BCV_API_ENDPOINTS) {
    try {
      const response = await fetch(endpoint.url, {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 segundos timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const parsed = endpoint.parser(data);

      if (typeof parsed.price !== 'number' || parsed.price <= 0) {
        throw new Error('Tasa inválida recibida de la API');
      }

      return {
        rate: parsed.price,
        timestamp: Date.now(),
        source: parsed.source,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError ?? new Error('Todas las APIs BCV fallaron');
}

/**
 * Obtiene la tasa BCV actual, usando caché si está disponible y vigente,
 * o consultando la API pública si no hay caché o expiró.
 * Como fallback final, usa la última tasa guardada en localStorage aunque haya expirado.
 */
export async function getBCVRate(): Promise<number> {
  // 1. Intentar obtener de caché válida
  const cached = getCachedExchangeRate();
  if (cached) {
    return cached.rate;
  }

  // 2. Consultar API pública
  try {
    const fresh = await fetchBCVRateFromAPI();
    setCachedExchangeRate(fresh.rate, fresh.source);
    return fresh.rate;
  } catch (error) {
    console.warn('Error al obtener tasa BCV de API:', error);

    // 3. Fallback: usar caché expirada si existe
    const expiredCache = getCachedExchangeRateIgnoringTTL();
    if (expiredCache) {
      console.warn('Usando tasa BCV de caché expirada como fallback:', expiredCache.rate);
      return expiredCache.rate;
    }

    // 4. Fallback final: tasa por defecto configurable (última conocida en Supabase o valor hardcodeado)
    const DEFAULT_FALLBACK_RATE = 857.00; // Valor de referencia actualizado
    console.warn('Usando tasa BCV de fallback hardcodeada:', DEFAULT_FALLBACK_RATE);
    return DEFAULT_FALLBACK_RATE;
  }
}

/**
 * Obtiene la caché ignorando el TTL (para fallback de emergencia).
 */
export function getCachedExchangeRateIgnoringTTL(): ExchangeRateData | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const stored = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as ExchangeRateData;
    if (parsed.rate > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convierte un precio en USD a Bolívares usando la tasa BCV actual.
 */
export async function convertUSDtoVES(priceUSD: number): Promise<number> {
  const rate = await getBCVRate();
  return priceUSD * rate;
}

/**
 * Formatea un precio en Bolívares con localización venezolana.
 */
export function formatVES(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un precio en USD con localización estándar.
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Interval ID para la actualización automática cada hora. */
let hourlyRefreshInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Inicia la actualización automática de la tasa BCV cada hora.
 * Llama a fetchBCVRateFromAPI y guarda en caché; ignora errores para no romper la app.
 */
export function startHourlyBCVRefresh(): void {
  if (typeof window === 'undefined' || hourlyRefreshInterval !== null) return;

  const refresh = async () => {
    try {
      const fresh = await fetchBCVRateFromAPI();
      setCachedExchangeRate(fresh.rate, fresh.source);
    } catch {
      // Silencioso: la próxima lectura usará fallback o caché existente.
    }
  };

  // Ejecutar inmediatamente y luego cada hora.
  refresh();
  hourlyRefreshInterval = setInterval(refresh, EXCHANGE_RATE_TTL_MS);
}

/**
 * Detiene la actualización automática (útil en tests o cleanup).
 */
export function stopHourlyBCVRefresh(): void {
  if (hourlyRefreshInterval !== null) {
    clearInterval(hourlyRefreshInterval);
    hourlyRefreshInterval = null;
  }
}