import {
  CakeSlice,
  Coffee,
  Cookie,
  LayoutGrid,
  Martini,
  Package,
  Pizza,
  Soup,
  Store,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import type { MerchantCategory } from '../../types/database';

/**
 * Iconos del marketplace.
 *
 * Viven fuera de los componentes para que los archivos `.tsx` exporten solo
 * componentes (regla `react/only-export-components`).
 */

/** Icono asociado a cada categoría de comercio del dominio. */
const MERCHANT_CATEGORY_ICONS: Record<MerchantCategory, LucideIcon> = {
  'Comida rápida': Soup,
  Restaurante: Store,
  Bebidas: Coffee,
  Postres: CakeSlice,
  Repostería: Cookie,
  Bodegón: Wine,
  Otro: Package,
};

export function resolveCategoryIcon(category: MerchantCategory): LucideIcon {
  return MERCHANT_CATEGORY_ICONS[category] ?? LayoutGrid;
}

/**
 * Iconos por palabra clave del nombre de categoría. Las categorías las crea el
 * comercio, así que en la ficha del local se resuelve por contenido en lugar de
 * por id; lo desconocido cae en el icono genérico.
 */
const KEYWORD_ICONS: readonly (readonly [RegExp, LucideIcon])[] = [
  [/pizza|italian|past[aá]/i, Pizza],
  [/bebida|refresco|jugo|caf[eé]|coffee|latte/i, Coffee],
  [/postre|dulce|torta/i, CakeSlice],
  [/reposter|panad|pasteler/i, Cookie],
  [/coctel|bar|vino|licor/i, Martini],
  [/entrada|caldo|sopa|ceviche/i, Soup],
];

export function resolveCategoryIconByName(name: string): LucideIcon {
  const match = KEYWORD_ICONS.find(([pattern]) => pattern.test(name));
  return match ? match[1] : LayoutGrid;
}