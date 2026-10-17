import { sanitizeIngredientList } from '../../utils/ingredients';

export interface IngredientPickerProps {
  productId: string;
  productTitle: string;
  /** Ingredientes configurados por el comercio para este platillo. */
  ingredients: readonly string[];
  /** Ingredientes que el cliente ya tachó. */
  excludedIngredients: readonly string[];
  onToggle: (productId: string, ingredient: string) => void;
  /** Dentro del acordeón de modificaciones omite su tarjeta propia. */
  embedded?: boolean;
}

/**
 * Compara ingredientes ignorando acentos y mayúsculas: el tachado tiene que
 * sobrevivir a que el platillo se guarde normalizado y el cliente lo lea de
 * vuelta desde la base de datos.
 */
function toComparisonKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Lista de ingredientes tachables del checkout, estilo comanda de mesonero: el
 * ingrediente no se borra de la vista, se marca como excluido para que la
 * cocina vea exactamente qué quitar.
 */
export function IngredientPicker({
  productId,
  productTitle,
  ingredients,
  excludedIngredients,
  onToggle,
  embedded = false,
}: IngredientPickerProps) {
  const available = sanitizeIngredientList(ingredients);
  const excluded = sanitizeIngredientList(excludedIngredients);
  if (available.length === 0) {
    return null;
  }

  const excludedKeys = new Set(excluded.map(toComparisonKey));

  return (
    <fieldset
      className={
        embedded
          ? ''
          : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
      }
      data-testid={`ingredient-picker-${productId}`}
      aria-label={embedded ? `Personaliza ${productTitle}` : undefined}
    >
      {!embedded && (
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Personaliza {productTitle}
        </legend>
      )}
      <p className="mb-3 text-xs text-slate-500">
        Toca los ingredientes que <span className="font-semibold">no</span> quieres
        en tu pedido.
      </p>
      <div className="flex flex-wrap gap-2">
        {available.map((ingredient) => {
          const isExcluded = excludedKeys.has(toComparisonKey(ingredient));
          return (
            <button
              key={ingredient}
              type="button"
              onClick={() => onToggle(productId, ingredient)}
              aria-pressed={isExcluded}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                isExcluded
                  ? 'border-red-200 bg-red-50 text-red-700 line-through opacity-80'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-red hover:text-brand-red'
              }`}
            >
              {ingredient}
            </button>
          );
        })}
      </div>
      {excluded.length > 0 && (
        <p className="mt-3 text-xs font-medium text-red-600">
          Sin: {excluded.join(', ')}
        </p>
      )}
    </fieldset>
  );
}