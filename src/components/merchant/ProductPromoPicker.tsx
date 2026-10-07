import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, ListChecks, Loader2, Tag, X } from 'lucide-react';
import {
  applyPromoToProducts,
  fetchMerchantProducts,
  hasPromo,
  type PromoProduct,
} from '../../services/promoProductsService';
import {
  BADGE_LABEL_SUGGESTIONS,
  MIN_DISCOUNT_PERCENTAGE,
  MAX_DISCOUNT_PERCENTAGE,
  isDiscountPercentageInputInvalid,
  parseBadgeLabel,
  parseDiscountPercentage,
} from '../../utils/promos';
import { formatUSD } from '../../utils/format';

export interface ProductPromoPickerProps {
  merchantId: string;
}

/**
 * Asocia la promoción del comercio a los platos concretos que elija.
 *
 * Resuelve el caso "quiero ponerle el distintivo de oferta a esta hamburguesa
 * y no a todo el menú": el comercio marca los platos en una lista y aplica
 * etiqueta + descuento en una sola acción. Desmarcar un plato y volver a
 * aplicar la misma promoción es la vía natural para quitarle la promoción.
 *
 * La etiqueta y el descuento se toman de los mismos parsers que usa el
 * formulario de un plato individual, de modo que lo que se escribe aquí se ve
 * exactamente igual en la tarjeta del plato.
 */
export function ProductPromoPicker({ merchantId }: ProductPromoPickerProps) {
  const [products, setProducts] = useState<PromoProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [badgeLabel, setBadgeLabel] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  /**
   * Evita llamar `setState` después de desmontar: la carga es async y su
   * `finally` podía ejecutarse cuando el componente ya no existe (en tests,
   * después de que vitist destruye el entorno, produciendo el unhandled
   * rejection `window is not defined` desde MerchantSettingsPage.test.tsx).
   */
  const isMountedRef = useRef(true);

  const loadProducts = useCallback(async () => {
    if (!merchantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await fetchMerchantProducts(merchantId);
      if (!isMountedRef.current) return;
      setProducts(loaded);
    } catch (loadError: unknown) {
      if (!isMountedRef.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar tu menú.',
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [merchantId]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadProducts();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadProducts]);

  const discountInvalid = isDiscountPercentageInputInvalid(discountInput);
  const promoWithDiscount = products.filter((p) => p.discount_percentage !== null).length;
  const selectableIds = useMemo(
    () => products.map((product) => product.id),
    [products],
  );

  function toggleProduct(productId: string) {
    setSuccess(null);
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  }

  function selectAll() {
    setSuccess(null);
    setSelectedIds(selectableIds);
  }

  function clearSelection() {
    setSuccess(null);
    setSelectedIds([]);
  }

  async function handleApply() {
    if (selectedIds.length === 0) {
      setError('Selecciona al menos un plato.');
      return;
    }
    if (discountInvalid) {
      setError(
        `El descuento debe estar entre ${MIN_DISCOUNT_PERCENTAGE} y ${MAX_DISCOUNT_PERCENTAGE}%.`,
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await applyPromoToProducts(merchantId, selectedIds, {
        badgeLabel: parseBadgeLabel(badgeLabel),
        discountPercentage: parseDiscountPercentage(discountInput),
      });
      if (!isMountedRef.current) return;
      setSuccess(
        `Promoción aplicada a ${updated} ${updated === 1 ? 'plato' : 'platos'}.`,
      );
      setSelectedIds([]);
      await loadProducts();
    } catch (saveError: unknown) {
      if (!isMountedRef.current) return;
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo aplicar la promoción.',
      );
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }

  if (isLoading) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando tu menú...
      </p>
    );
  }

  if (products.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        Todavía no tienes platos en el menú. Crea uno desde la sección{' '}
        <strong>Platillos</strong> y vuelve aquí para aplicarle la promoción.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">
        Marca los platos que quieres incluir en la promoción y aplícala. Si
        dejas la etiqueta y el descuento vacíos, se quitan de los platos
        seleccionados.
      </p>

      <fieldset>
        <div className="mb-2 flex items-center justify-between gap-2">
          <legend className="text-sm font-medium text-gray-700">
            Platillos ({selectedIds.length} de {products.length} seleccionados)
          </legend>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Todos
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Quitar
            </button>
          </div>
        </div>

        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
          {products.map((product) => {
            const checked = selectedIds.includes(product.id);
            return (
              <li key={product.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProduct(product.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-800">
                    {product.title}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {formatUSD(product.price)}
                  </span>
                  {hasPromo(product) && (
                    <Tag
                      className="h-3.5 w-3.5 shrink-0 text-brand-red"
                      aria-label="Tiene promoción aplicada"
                    />
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="promo-dish-badge"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Etiqueta del plato
          </label>
          <input
            id="promo-dish-badge"
            type="text"
            list="promo-dish-badge-suggestions"
            value={badgeLabel}
            onChange={(e) => {
              setBadgeLabel(e.target.value);
              setSuccess(null);
            }}
            placeholder="Ej. 2x1"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <datalist id="promo-dish-badge-suggestions">
            {BADGE_LABEL_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div>
          <label
            htmlFor="promo-dish-discount"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Descuento del plato (%)
          </label>
          <input
            id="promo-dish-discount"
            type="number"
            inputMode="numeric"
            min={MIN_DISCOUNT_PERCENTAGE}
            max={MAX_DISCOUNT_PERCENTAGE}
            step={1}
            value={discountInput}
            onChange={(e) => {
              setDiscountInput(e.target.value);
              setSuccess(null);
            }}
            placeholder="0"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
              discountInvalid ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={isSaving || selectedIds.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          {isSaving ? 'Aplicando...' : 'Aplicar a los seleccionados'}
        </button>
        {promoWithDiscount > 0 && (
          <span className="text-xs text-gray-500">
            {promoWithDiscount} de {products.length} platos ya tienen
            descuento.
          </span>
        )}
      </div>

      {error !== null && (
        <p role="alert" className="rounded-md bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {success !== null && (
        <p
          role="status"
          className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-800"
        >
          {success}
        </p>
      )}
    </div>
  );
}