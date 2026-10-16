/**
 * Ingredientes del platillo: normalización, lista editable y exclusiones del
 * cliente.
 *
 * Un ingrediente siempre se guarda ya normalizado ("Primera Mayúscula", resto
 * en minúsculas) para que el mismo texto no aparezca de tres formas distintas
 * en el menú, en el checkout y en la comanda de cocina. La comparación entre
 * ingredientes ignora acentos y mayúsculas, así "Cebolla" y "cebolla" se
 * consideran el mismo ingrediente.
 */

/** Máximo de ingredientes configurables por platillo. */
export const MAX_INGREDIENTS_PER_DISH = 20;

/** Máximo de caracteres de un ingrediente, contando espacios. */
export const MAX_INGREDIENT_LENGTH = 40;

/** Quita acentos y pasa a minúsculas para comparar sin sorpresas. */
function foldForComparison(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Normaliza un ingrediente escrito por el comercio: colapsa los espacios,
 * pasa la primera letra a mayúscula y el resto a minúsculas, sin importar cómo
 * se haya escrito. Devuelve cadena vacía si no queda texto utilizable.
 */
export function normalizeIngredient(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';
  const first = collapsed.charAt(0).toLocaleUpperCase('es');
  return first + collapsed.slice(1).toLocaleLowerCase('es');
}

/**
 * Convierte cualquier valor (JSONB de la base de datos, `localStorage` viejo,
 * datos del carrito) en una lista de ingredientes válida: solo strings
 * normalizados, sin vacíos, sin repetidos y sin pasarse del máximo.
 */
export function sanitizeIngredientList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of input) {
    if (result.length >= MAX_INGREDIENTS_PER_DISH) break;
    const ingredient = normalizeIngredient(raw);
    if (!ingredient) continue;
    const key = foldForComparison(ingredient);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ingredient);
  }
  return result;
}

/**
 * Agrega un ingrediente a la lista del formulario. Es idempotente por diseño:
 * si ya existe (sin importar acentos ni mayúsculas) o la lista está llena,
 * devuelve una copia sin cambios para que la UI nunca desincronice.
 */
export function addIngredient(
  list: readonly string[],
  raw: unknown,
): string[] {
  const current = sanitizeIngredientList(list);
  const ingredient = normalizeIngredient(raw);
  if (!ingredient) return [...current];
  if (current.length >= MAX_INGREDIENTS_PER_DISH) return [...current];
  const key = foldForComparison(ingredient);
  const alreadyListed = current.some(
    (existing) => foldForComparison(existing) === key,
  );
  if (alreadyListed) return [...current];
  return [...current, ingredient];
}

/** Quita un ingrediente de la lista del formulario. */
export function removeIngredient(
  list: readonly string[],
  raw: unknown,
): string[] {
  const key = foldForComparison(normalizeIngredient(raw));
  if (!key) return [...list];
  return list.filter((existing) => foldForComparison(existing) !== key);
}

/**
 * Alterna un ingrediente en la lista de exclusiones del cliente. Es la operación
 * que hace el tachado en el checkout: el ingrediente no desaparece de la lista,
 * solo pasa a estar marcado como excluido.
 */
export function toggleExcludedIngredient(
  excluded: readonly string[],
  raw: unknown,
): string[] {
  const current = sanitizeIngredientList(excluded);
  const ingredient = normalizeIngredient(raw);
  if (!ingredient) return [...current];
  const key = foldForComparison(ingredient);
  const isExcluded = current.some(
    (existing) => foldForComparison(existing) === key,
  );
  if (isExcluded) {
    return current.filter((existing) => foldForComparison(existing) !== key);
  }
  return [...current, ingredient];
}