import { supabase } from '../services/supabase';

export interface ExchangeRateData {
  currency: string;
  rate: number;
  updated_at: string;
}

const EXCHANGE_RATE_STORAGE_KEY = 'menugram_exchange_rate_cache';
const EXCHANGE_RATE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface CachedExchangeRate {
  rate: number;
  timestamp: number;
  source: string;
  currency: string;
}

/**
 * Obtiene la tasa de cambio desde localStorage si es válida (menos de 30 min).
 */
export function getCachedExchangeRate(): CachedExchangeRate | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as CachedExchangeRate;
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
 * Guarda la tasa de cambio en localStorage con timestamp actual.
 */
export function setCachedExchangeRate(rate: number, source: string, currency: string = 'USD'): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const data: CachedExchangeRate = {
      rate,
      timestamp: Date.now(),
      source,
      currency,
    };
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar errores de localStorage
  }
}

/**
 * Obtiene la tasa USD desde la tabla exchange_rates de Supabase.
 */
export async function fetchExchangeRateFromSupabase(currency: string = 'USD'): Promise<number> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate, updated_at')
    .eq('currency', currency)
    .single();

  if (error) {
    throw new Error(`Error fetching exchange rate: ${error.message}`);
  }

  if (!data || typeof data.rate !== 'number' || data.rate <= 0) {
    throw new Error('Invalid rate from Supabase');
  }

  return data.rate;
}

/**
 * Obtiene la tasa de cambio actual, usando caché local si está disponible y vigente,
 * o consultando Supabase si no hay caché o expiró.
 */
export async function getExchangeRate(currency: string = 'USD'): Promise<number> {
  // 1. Intentar obtener de caché válida
  const cached = getCachedExchangeRate();
  if (cached && cached.currency === currency) {
    return cached.rate;
  }

  // 2. Consultar Supabase
  try {
    const rate = await fetchExchangeRateFromSupabase(currency);
    setCachedExchangeRate(rate, 'supabase', currency);
    return rate;
  } catch (error) {
    console.warn('Error al obtener tasa de cambio de Supabase:', error);

    // 3. Fallback: usar caché expirada si existe
    const expiredCache = getCachedExchangeRateIgnoringTTL(currency);
    if (expiredCache) {
      console.warn('Usando tasa de cambio de caché expirada como fallback:', expiredCache.rate);
      return expiredCache.rate;
    }

    // 4. Fallback final: tasa por defecto
    const DEFAULT_FALLBACK_RATE = 857.00;
    console.warn('Usando tasa de cambio de fallback hardcodeada:', DEFAULT_FALLBACK_RATE);
    return DEFAULT_FALLBACK_RATE;
  }
}

/**
 * Obtiene la caché ignorando el TTL (para fallback de emergencia).
 */
export function getCachedExchangeRateIgnoringTTL(currency: string = 'USD'): CachedExchangeRate | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const stored = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as CachedExchangeRate;
    if (parsed.rate > 0 && parsed.currency === currency) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convierte un precio en USD a Bolívares usando la tasa actual.
 */
export async function convertUSDtoVES(priceUSD: number): Promise<number> {
  const rate = await getExchangeRate('USD');
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