/**
 * Utilidades de presentación de valoraciones (estrellas estilo hotel).
 *
 * El marketplace muestra la reputación del comercio como estrellas visuales
 * sobre el banner más un porcentaje equivalente a la puntuación (0-100 %),
 * en lugar del promedio con la cantidad de reseñas entre paréntesis.
 */

import type { RatingSummary } from '../services/orderRatingService';

/** Escala máxima de la encuesta post-pedido. */
export const RATING_MAX_STARS = 5;

/**
 * Cantidad de estrellas (de 5) que deben pintarse llenas para un promedio.
 * `Math.round` da el clásico redondeo de hoteles: 4,5 → 5 estrellas llenas.
 */
export function fullStarsForRating(average: number): number {
  if (!Number.isFinite(average)) return 0;
  const rounded = Math.round(average);
  return Math.min(RATING_MAX_STARS, Math.max(0, rounded));
}

/**
 * Traduce el promedio (0-5) a su porcentaje de valoración (0-100 %).
 * Ej.: 4,5 → 90 %; 5 → 100 %.
 */
export function ratingToPercent(average: number): number {
  if (!Number.isFinite(average)) return 0;
  const percent = Math.round((average / RATING_MAX_STARS) * 100);
  return Math.min(100, Math.max(0, percent));
}

/**
 * Indica si el resumen tiene suficientes valoraciones para mostrarse.
 * Con 0 valoraciones el comercio aún no tiene reputación pública y el
 * badge se oculta para no penalizarlo en el marketplace.
 * Funciona además como type guard hacia `RatingSummary`.
 */
export function hasVisibleRating(
  rating: RatingSummary | null | undefined,
): rating is RatingSummary {
  return rating !== null && rating !== undefined && rating.count > 0;
}
