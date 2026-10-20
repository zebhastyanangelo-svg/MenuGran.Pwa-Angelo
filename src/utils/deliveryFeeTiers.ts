/**
 * Utilidades puras para tramos de tarifa de delivery por distancia.
 *
 * Cada comercio define tramos (min_km, max_km] con un monto fijo. El checkout
 * calcula la distancia real entre el comercio y el cliente, encuentra el tramo
 * correspondiente y aplica esa tarifa.
 */
import type { DeliveryFeeTierRow } from '../types/database';

export interface DeliveryFeeTierInput {
  minKm: number;
  maxKm: number;
  fee: number;
}

const TIER_DECIMALS = 2;

/**
 * Encuentra el tramo de tarifa correspondiente a una distancia en km.
 * Devuelve `null` si la distancia supera el radio máximo de todos los tramos.
 */
export function findTierForDistance(
  tiers: readonly DeliveryFeeTierRow[],
  distanceKm: number,
): DeliveryFeeTierRow | null {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;

  const sorted = [...tiers].sort((a, b) => a.min_km - b.min_km);
  return (
    sorted.find(
      (tier) => distanceKm >= tier.min_km && distanceKm <= tier.max_km,
    ) ?? null
  );
}

/**
 * Calcula el costo de envío según la distancia y los tramos del comercio.
 *
 * Devuelve un objeto con:
 * - `fee`: la tarifa en USD (0 si no hay tramos configurados).
 * - `tier`: el tramo que aplicó, o `null` si no se encontró ninguno.
 * - `distanceKm`: la distancia calculada.
 * - `outOfRange`: `true` si la distancia supera el radio máximo permitido.
 */
export function resolveDeliveryFeeByDistance(
  tiers: readonly DeliveryFeeTierRow[],
  distanceKm: number,
): {
  fee: number;
  tier: DeliveryFeeTierRow | null;
  distanceKm: number;
  outOfRange: boolean;
} {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return { fee: 0, tier: null, distanceKm: 0, outOfRange: true };
  }

  const tier = findTierForDistance(tiers, distanceKm);

  if (!tier) {
    const maxRange = tiers.length > 0
      ? Math.max(...tiers.map((t) => t.max_km))
      : 0;
    return { fee: 0, tier: null, distanceKm, outOfRange: distanceKm > maxRange };
  }

  return { fee: tier.fee, tier, distanceKm, outOfRange: false };
}

/** Valida los tramos ingresados en el formulario de configuración. */
export function validateDeliveryFeeTiers(
  tiers: readonly DeliveryFeeTierInput[],
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const sorted = [...tiers].sort((a, b) => a.minKm - b.minKm);

  for (const tier of sorted) {
    if (!Number.isFinite(tier.minKm) || tier.minKm < 0) {
      errors.push('La distancia mínima debe ser >= 0 km.');
      continue;
    }
    if (!Number.isFinite(tier.maxKm) || tier.maxKm <= tier.minKm) {
      errors.push(
        `La distancia máxima (${tier.maxKm} km) debe ser mayor que la mínima (${tier.minKm} km).`,
      );
      continue;
    }
    if (!Number.isFinite(tier.fee) || tier.fee < 0) {
      errors.push('La tarifa debe ser >= 0 USD.');
    }
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.minKm < prev.maxKm) {
      errors.push(
        `Los tramos ${prev.minKm}-${prev.maxKm} km y ${curr.minKm}-${curr.maxKm} km se solapan.`,
      );
    }
  }

  return { isValid: errors.length === 0, errors };
}

/** Formatea un tramo para mostrar en la UI (ej. "0 - 5 km → $2.00"). */
export function formatFeeTier(tier: {
  min_km: number;
  max_km: number;
  fee: number;
}): string {
  const min = tier.min_km.toFixed(TIER_DECIMALS);
  const max = tier.max_km.toFixed(TIER_DECIMALS);
  const fee = tier.fee.toFixed(TIER_DECIMALS);
  return `${min} - ${max} km → $${fee}`;
}
