import { useState } from 'react';
import { IngredientPicker } from './IngredientPicker';
import { sanitizeIngredientList } from '../../utils/ingredients';

export interface ItemModificationsAccordionProps {
  productId: string;
  productTitle: string;
  /** Ingredientes configurados por el comercio para este platillo. */
  ingredients: readonly string[];
  /** Ingredientes que el cliente ya tachó. */
  excludedIngredients: readonly string[];
  /** Nota libre del cliente para esta línea (ej. "Sin cebolla"). */
  notes: string;
  onToggleIngredient: (productId: string, ingredient: string) => void;
  onNotesChange: (productId: string, notes: string) => void;
}

/** Máximo de caracteres de la nota libre por platillo. */
export const MAX_ITEM_NOTES_LENGTH = 200;

/**
 * Acordeón de personalización de un platillo, justo antes de confirmar el
 * pedido: permite tachar ingredientes y escribir una nota libre. Ambas cosas
 * se guardan en el ítem del carrito, así que sobreviven al cierre del panel y
 * viajan a la orden sin cambiar el backend.
 */
export function ItemModificationsAccordion({
  productId,
  productTitle,
  ingredients,
  excludedIngredients,
  notes,
  onToggleIngredient,
  onNotesChange,
}: ItemModificationsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const excludedCount = sanitizeIngredientList(excludedIngredients).length;
  const hasNotes = notes.trim().length > 0;
  const modificationCount = excludedCount + (hasNotes ? 1 : 0);
  const panelId = `modifications-panel-${productId}`;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-testid={`modifications-${productId}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        data-testid={`modifications-toggle-${productId}`}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <i className="fa-solid fa-utensils text-brand-red" aria-hidden="true" />
          Personalizar {productTitle}
        </span>
        <span className="flex items-center gap-2">
          {modificationCount > 0 && (
            <span
              className="rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-semibold text-brand-red"
              data-testid={`modifications-count-${productId}`}
            >
              {modificationCount}
            </span>
          )}
          <i
            className={`fa-solid text-slate-400 ${
              isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      {isExpanded && (
        <div
          id={panelId}
          className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3"
        >
          <IngredientPicker
            productId={productId}
            productTitle={productTitle}
            ingredients={ingredients}
            excludedIngredients={excludedIngredients}
            onToggle={onToggleIngredient}
            embedded
          />

          <div>
            <label
              htmlFor={`item-notes-${productId}`}
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Notas adicionales
            </label>
            <textarea
              id={`item-notes-${productId}`}
              value={notes}
              maxLength={MAX_ITEM_NOTES_LENGTH}
              onChange={(event) => onNotesChange(productId, event.target.value)}
              placeholder="Ej. Sin cebolla, sin salsa, punto de cocción medio..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>
      )}
    </section>
  );
}
