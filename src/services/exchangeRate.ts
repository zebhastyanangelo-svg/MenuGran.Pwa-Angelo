/**
 * Servicio central de MenuGram para obtener y cachear la tasa oficial BCV
 * (Banco Central de Venezuela) desde DolarApi Venezuela.
 *
 * Endpoint oficial: https://dolarapi.com/v1/venezuela/dolares/bcv
 * De la respuesta JSON se extrae estrictamente la propiedad `promedio`,
 * que corresponde a la tasa del dólar oficial del BCV.
 *
 * Estrategia de resiliencia:
 * 1. Caché en memoria + localStorage con TTL de 1 hora (evita llamar a la API
 *    en cada renderizado o recarga de página).
 * 2. Deduplicación de peticiones concurrentes (un solo fetch compartido).
 * 3. Fallbacks: endpoints públicos alternativos, última tasa en caché
 *    (aunque haya expirado) y tasa por defecto como último recurso.
 */

export const EXCHANGE_RATE_STORAGE_KEY = 'menugram_bcv_exchange_rate';
export const EXCHANGE_RATE_TTL_MS = 60 * 60 * 1000; // 1 hora en milisegundos
/** Última tasa conocida; se usa solo cuando la API y la caché fallan. */
export const DEFAULT_FALLBACK_RATE = 857.0;

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

/** Respuesta de DolarApi Venezuela para la tasa BCV. */
export interface DolarApiVenezuelaResponse {
  moneda?: string;
  fuente?: string;
  nombre?: string;
  compra?: number | null;
  venta?: number | null;
  /** Promedio oficial BCV en Bs. por USD: única propiedad usada como tasa. */
  promedio?: number | string | null;
  fechaActualizacion?: string;
}

interface BCVApiEndpoint {
  url: string;
  parser: (data: unknown) => BCVRateResponse;
}

/** Caché en memoria de la última tasa obtenida. */
let memoryCache: ExchangeRateData | null = null;
/** Petición en curso, compartida entre llamadores concurrentes. */
let inFlightFetch: Promise<ExchangeRateData> | null = null;

/** Convierte un valor desconocido a número finito, o NaN si no es posible. */
function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseFloat(value);
    return parsed;
  }
  return NaN;
}

/** Asegura un objeto plano a partir de un valor desconocido. */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Parser estricto de DolarApi Venezuela: extrae exclusivamente la
 * propiedad `promedio` de la respuesta y valida que sea una tasa positiva.
 */
function parseDolarApiPromedio(data: unknown, source: string): BCVRateResponse {
  const record = asRecord(data);
  const price = toFiniteNumber(record.promedio);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Tasa inválida (promedio) recibida de ${source}`);
  }

  const dateCandidate = record.fechaActualizacion;
  const date = typeof dateCandidate === 'string' ? dateCandidate : new Date().toISOString();
  return { price, date, source };
}

/**
 * Parser tolerante para endpoints legacy: acepta `promedio`, `price`,
 * `rate` o `monto`, opcionalmente anidados bajo `bcv`.
 */
function parseLegacyBCVEndpoint(data: unknown, source: string): BCVRateResponse {
  const root = asRecord(data);
  const bcv = asRecord(root.bcv);

  const rateCandidate =
    root.promedio ?? root.price ?? root.rate ?? root.monto ?? bcv.promedio ?? bcv.price ?? bcv.rate ?? bcv.monto;
  const price = toFiniteNumber(rateCandidate);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Tasa inválida recibida de ${source}`);
  }

  const dateCandidate = root.fecha ?? root.date ?? bcv.fecha ?? bcv.date;
  const date = typeof dateCandidate === 'string' ? dateCandidate : new Date().toISOString();
  return { price, date, source };
}

/**
 * APIs públicas para obtener la tasa BCV oficial.
 * Se intentan en orden hasta que una responda correctamente:
 * 1. DolarApi Venezuela (endpoint oficial BCV, propiedad `promedio`).
 * 2. DolarApi Venezuela (dominio legacy, misma propiedad `promedio`).
 * 3-4. Endpoints legacy de la comunidad como respaldo.
 */
const BCV_API_ENDPOINTS: BCVApiEndpoint[] = [
  {
    url: 'https://dolarapi.com/v1/venezuela/dolares/bcv',
    parser: (data) => parseDolarApiPromedio(data, 'dolarapi.com/venezuela/bcv'),
  },
  {
    url: 'https://ve.dolarapi.com/v1/dolares/oficial',
    parser: (data) => parseDolarApiPromedio(data, 've.dolarapi.com/oficial'),
  },
  {
    url: 'https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv',
    parser: (data) => parseLegacyBCVEndpoint(data, 'pydolarvenezuela-api.vercel.app'),
  },
  {
    url: 'https://bcv-api.vercel.app/api/bcv',
    parser: (data) => parseLegacyBCVEndpoint(data, 'bcv-api.vercel.app'),
  },
];

function isValidCacheEntry(data: ExchangeRateData | null): data is ExchangeRateData {
  return data !== null && data.rate > 0 && Date.now() - data.timestamp < EXCHANGE_RATE_TTL_MS;
}

function readStoredCache(): ExchangeRateData | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const stored = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ExchangeRateData;
  } catch {
    return null;
  }
}

/**
 * Obtiene la tasa BCV desde caché (memoria o localStorage) si es válida (menos de 1 hora).
 */
export function getCachedExchangeRate(): ExchangeRateData | null {
  if (isValidCacheEntry(memoryCache)) {
    return memoryCache;
  }

  const stored = readStoredCache();
  if (isValidCacheEntry(stored)) {
    memoryCache = stored;
    return stored;
  }

  return null;
}

/**
 * Guarda la tasa BCV en memoria y localStorage con timestamp actual.
 */
export function setCachedExchangeRate(rate: number, source: string): void {
  const data: ExchangeRateData = {
    rate,
    timestamp: Date.now(),
    source,
  };

  memoryCache = data;

  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar errores de localStorage (cuota excedida, modo privado, etc.)
  }
}

/**
 * Obtiene la última tasa guardada ignorando el TTL (para fallback de emergencia).
 */
export function getCachedExchangeRateIgnoringTTL(): ExchangeRateData | null {
  if (memoryCache && memoryCache.rate > 0) {
    return memoryCache;
  }

  const stored = readStoredCache();
  return stored && stored.rate > 0 ? stored : null;
}

/**
 * Limpia la caché de la tasa (memoria y localStorage).
 * Útil en tests o para forzar una nueva consulta a la API.
 */
export function clearExchangeRateCache(): void {
  memoryCache = null;
  inFlightFetch = null;

  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem(EXCHANGE_RATE_STORAGE_KEY);
  } catch {
    // Ignorar errores de localStorage
  }
}

async function fetchBCVFromEndpoint(endpoint: BCVApiEndpoint): Promise<ExchangeRateData> {
  const response = await fetch(endpoint.url, {
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000), // 10 segundos de timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: unknown = await response.json();
  const parsed = endpoint.parser(data);

  if (typeof parsed.price !== 'number' || parsed.price <= 0) {
    throw new Error('Tasa inválida recibida de la API');
  }

  return {
    rate: parsed.price,
    timestamp: Date.now(),
    source: parsed.source,
  };
}

async function fetchFirstAvailableBCVEndpoint(): Promise<ExchangeRateData> {
  let lastError: Error | null = null;

  for (const endpoint of BCV_API_ENDPOINTS) {
    try {
      return await fetchBCVFromEndpoint(endpoint);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Todas las APIs BCV fallaron');
}

/**
 * Consulta la tasa BCV desde las APIs públicas disponibles.
 * Deduplica peticiones concurrentes: si ya hay un fetch en curso,
 * los llamadores concurrentes esperan el mismo resultado.
 */
export async function fetchBCVRateFromAPI(): Promise<ExchangeRateData> {
  if (inFlightFetch) {
    return inFlightFetch;
  }

  const request = fetchFirstAvailableBCVEndpoint().finally(() => {
    if (inFlightFetch === request) {
      inFlightFetch = null;
    }
  });
  inFlightFetch = request;

  return request;
}

/**
 * Obtiene la tasa BCV actual. Fuente central para toda la aplicación:
 * 1. Caché válida en memoria/localStorage.
 * 2. API DolarApi Venezuela (con endpoints de respaldo).
 * 3. Si la red falla: última tasa guardada en caché aunque haya expirado.
 * 4. Último recurso: tasa por defecto conocida.
 */
export async function getBCVRate(): Promise<number> {
  const cached = getCachedExchangeRate();
  if (cached) {
    return cached.rate;
  }

  try {
    const fresh = await fetchBCVRateFromAPI();
    setCachedExchangeRate(fresh.rate, fresh.source);
    return fresh.rate;
  } catch (error) {
    console.warn('Error al obtener tasa BCV de la API:', error);

    const staleCache = getCachedExchangeRateIgnoringTTL();
    if (staleCache) {
      console.warn('Usando tasa BCV de caché expirada como fallback:', staleCache.rate);
      return staleCache.rate;
    }

    console.warn('Usando tasa BCV de fallback por defecto:', DEFAULT_FALLBACK_RATE);
    return DEFAULT_FALLBACK_RATE;
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
