import type { MerchantCategory } from '../../types/database';

/**
 * Iconos del marketplace.
 *
 * Viven fuera de los componentes para que los archivos `.tsx` exporten solo
 * componentes (regla `react/only-export-components`).
 */

/** Icono asociado a cada categoría de comercio del dominio. */
const MERCHANT_CATEGORY_ICONS: Record<MerchantCategory, string> = {
  'Comida rápida': 'fa-solid fa-bowl-food',
  Restaurante: 'fa-solid fa-store',
  Bebidas: 'fa-solid fa-mug-saucer',
  Postres: 'fa-solid fa-cake-candles',
  Repostería: 'fa-solid fa-cookie',
  Bodegón: 'fa-solid fa-wine-glass',
  Otro: 'fa-solid fa-box',
};

export function resolveCategoryIcon(category: MerchantCategory): string {
  return MERCHANT_CATEGORY_ICONS[category] ?? 'fa-solid fa-table-cells-large';
}

/**
 * Iconos por palabra clave del nombre de categoría. Las categorías las crea el
 * comercio, así que en la ficha del local se resuelve por contenido en lugar de
 * por id; lo desconocido cae en el icono genérico.
 */
const KEYWORD_ICONS: readonly (readonly [RegExp, string])[] = [
  [/pizza|italian|past[aá]/i, 'fa-solid fa-pizza-slice'],
  [/bebida|refresco|jugo|caf[eé]|coffee|latte/i, 'fa-solid fa-mug-saucer'],
  [/postre|dulce|torta/i, 'fa-solid fa-cake-candles'],
  [/reposter|panad|pasteler/i, 'fa-solid fa-cookie'],
  [/coctel|bar|vino|licor/i, 'fa-solid fa-martini-glass'],
  [/entrada|caldo|sopa|ceviche/i, 'fa-solid fa-bowl-food'],
];

export function resolveCategoryIconByName(name: string): string {
  const match = KEYWORD_ICONS.find(([pattern]) => pattern.test(name));
  return match ? match[1] : 'fa-solid fa-table-cells-large';
}