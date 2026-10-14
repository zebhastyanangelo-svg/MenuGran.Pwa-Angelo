/**
 * Categorización de valoraciones del panel de votaciones del superadmin.
 *
 * El dashboard agrupa las encuestas post-pedido en tres niveles de calidad:
 *  - buena:   4-5 estrellas (cliente satisfecho)
 *  - normal:  3 estrellas (experiencia aceptable)
 *  - mala:    1-2 estrellas (queja; requiere seguimiento operativo)
 */

/** Categoría de calidad asignada a una valoración. */
export type RatingCategory = 'good' | 'normal' | 'bad';

export const RATING_CATEGORY_LABELS: Record<RatingCategory, string> = {
  good: 'Buenas',
  normal: 'Normales',
  bad: 'Malas',
};

/**
 * Clasifica una valoración en su categoría según las estrellas recibidas.
 * Devuelve `null` cuando el valor está fuera del rango 1-5.
 */
export function classifyStars(stars: number): RatingCategory | null {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return null;
  if (stars >= 4) return 'good';
  if (stars === 3) return 'normal';
  return 'bad';
}

/**
 * Clasifica una valoración usando la nota principal disponible: la del
 * negocio cuando existe, y en su defecto la de la plataforma.
 */
export function classifyRatingRow(input: {
  merchantStars: number;
  platformStars: number;
}): RatingCategory | null {
  const primary = classifyStars(input.merchantStars);
  return primary !== null ? primary : classifyStars(input.platformStars);
}
