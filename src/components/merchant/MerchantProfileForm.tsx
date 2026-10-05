import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { supabase, TABLE_NAMES } from '../../services/supabase';
import { uploadToImgBB } from '../../services/imgbb';
import type { MerchantRow } from '../../types/database';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import {
  MAX_BADGE_LABEL_LENGTH,
  MAX_DISCOUNT_PERCENTAGE,
  MAX_ESTIMATED_MINUTES,
  MIN_DISCOUNT_PERCENTAGE,
  PROMO_LABEL_SUGGESTIONS,
  formatDiscountBadge,
  formatEstimatedDeliveryRange,
  isDiscountPercentageInputInvalid,
  isEstimatedMinutesInputInvalid,
  parseBadgeLabel,
  parseDiscountPercentage,
  parseEstimatedMinutes,
} from '../../utils/promos';

export interface MerchantProfileFormProps {
  merchantId: string;
  onUpdated?: (merchant: MerchantRow) => void;
}

interface ImageFieldState {
  url: string | null;
  uploading: boolean;
  error: string | null;
}

interface PromoFieldErrors {
  promoLabel: string;
  discountInput: string;
  estimatedInput: string;
}

/**
 * Valida los campos de promoción sobre el texto crudo del input: los parsers
 * normalizan a `null` lo inválido, y sin esta comprobación un valor fuera de
 * rango se descartaría en silencio al guardar.
 */
function collectPromoFieldErrors(fields: PromoFieldErrors): Record<string, string> {
  const errors: Record<string, string> = {};

  if (fields.promoLabel.trim().length > MAX_BADGE_LABEL_LENGTH) {
    errors.promo_label = `La etiqueta no puede superar ${MAX_BADGE_LABEL_LENGTH} caracteres.`;
  }
  if (isDiscountPercentageInputInvalid(fields.discountInput)) {
    errors.discount_percentage = `El descuento debe estar entre ${MIN_DISCOUNT_PERCENTAGE} y ${MAX_DISCOUNT_PERCENTAGE}%.`;
  }
  if (isEstimatedMinutesInputInvalid(fields.estimatedInput)) {
    errors.estimated_delivery_minutes = `El tiempo debe estar entre 1 y ${MAX_ESTIMATED_MINUTES} minutos.`;
  }

  return errors;
}

/**
 * Formulario de edición del perfil de negocio (nombre, logo y banner).
 *
 * Las imágenes públicas (logo y banner) se suben a ImgBB, manteniendo
 * Supabase Storage exclusivamente para los comprobantes de pago.
 */
export function MerchantProfileForm({
  merchantId,
  onUpdated,
}: MerchantProfileFormProps) {
  const [merchant, setMerchant] = useState<MerchantRow | null>(null);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<ImageFieldState>({
    url: null,
    uploading: false,
    error: null,
  });
  const [banner, setBanner] = useState<ImageFieldState>({
    url: null,
    uploading: false,
    error: null,
  });
  const [promoLabel, setPromoLabel] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [estimatedInput, setEstimatedInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId) {
      setLoading(false);
      return;
    }

    const fetchMerchant = async () => {
      setLoading(true);
      setSubmitError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from(TABLE_NAMES.merchants)
          .select('*')
          .eq('id', merchantId)
          .single();

        if (fetchError) throw fetchError;

        const row = data as MerchantRow;
        setMerchant(row);
        setName(row.name ?? '');
        setLogo({ url: row.logo_url ?? null, uploading: false, error: null });
        setBanner({ url: row.banner_url ?? null, uploading: false, error: null });
        setPromoLabel(row.promo_label ?? '');
        setDiscountInput(
          row.discount_percentage != null ? String(row.discount_percentage) : '',
        );
        setEstimatedInput(
          row.estimated_delivery_minutes != null
            ? String(row.estimated_delivery_minutes)
            : '',
        );
        setFieldErrors({});
      } catch (err: unknown) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Error al cargar el perfil del negocio.',
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchMerchant();
  }, [merchantId]);

  const handleImageChange = async (
    e: ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'banner',
  ) => {
    const file = e.target.files?.[0];
    const setter = field === 'logo' ? setLogo : setBanner;
    if (!file) return;

    setter((prev) => ({ ...prev, uploading: true, error: null }));

    try {
      const url = await uploadToImgBB(file);
      setter({ url, uploading: false, error: null });
    } catch (err: unknown) {
      setter({
        url: null,
        uploading: false,
        error: err instanceof Error ? err.message : 'Error al subir la imagen.',
      });
    }
  };

  const clearImage = (field: 'logo' | 'banner') => {
    const setter = field === 'logo' ? setLogo : setBanner;
    setter({ url: null, uploading: false, error: null });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    const promoErrors = collectPromoFieldErrors({
      promoLabel,
      discountInput,
      estimatedInput,
    });
    if (Object.keys(promoErrors).length > 0) {
      setFieldErrors(promoErrors);
      setSubmitError('Revisa los campos de promoción antes de guardar.');
      return;
    }

    setFieldErrors({});
    setSaving(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const updates: Partial<
        Pick<
          MerchantRow,
          | 'name'
          | 'logo_url'
          | 'banner_url'
          | 'promo_label'
          | 'discount_percentage'
          | 'estimated_delivery_minutes'
        >
      > = {
        name: name.trim(),
        logo_url: logo.url,
        banner_url: banner.url,
        promo_label: parseBadgeLabel(promoLabel),
        discount_percentage: parseDiscountPercentage(discountInput),
        estimated_delivery_minutes: parseEstimatedMinutes(estimatedInput),
      };

      const { error: updateError, data } = await supabase
        .from(TABLE_NAMES.merchants)
        .update(updates)
        .eq('id', merchant.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updated = (data ?? {
        ...merchant,
        ...updates,
      }) as MerchantRow;
      setMerchant(updated);
      setSubmitSuccess('Perfil actualizado correctamente.');
      onUpdated?.(updated);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar el perfil.',
      );
    } finally {
      setSaving(false);
    }
  };

  const renderImageField = (
    label: string,
    field: 'logo' | 'banner',
    state: ImageFieldState,
  ) => {
    const inputId = `merchant-${field}-input`;
    return (
      <div>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
        <div className="flex items-center gap-4">
          {state.url ? (
            <div className="relative w-24 h-24 sm:w-32 sm:h-24 bg-gray-100 rounded border overflow-hidden flex-shrink-0">
              <img
                src={state.url}
                alt={`Vista previa ${label.toLowerCase()}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => clearImage(field)}
                disabled={state.uploading}
                className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl font-bold disabled:opacity-50"
                title="Quitar imagen"
                aria-label={`Quitar ${label.toLowerCase()}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-24 bg-gray-50 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center p-1 flex-shrink-0">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}

          <div className="flex-grow">
            <label
              htmlFor={inputId}
              className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded text-xs font-medium cursor-pointer transition ${
                state.uploading
                  ? 'bg-gray-200 text-gray-500 cursor-wait'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
              }`}
            >
              <Upload className="h-3 w-3" />
              {state.uploading ? 'Subiendo...' : 'Seleccionar foto'}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              aria-label={`Seleccionar foto de ${field}`}
              onChange={(e) => handleImageChange(e, field)}
              disabled={state.uploading}
              className="sr-only"
            />
            {state.error && (
              <p className="mt-1 text-xs text-red-600">{state.error}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 font-medium" role="status">
        Cargando perfil del negocio...
      </div>
    );
  }

  if (!merchant) {
    return null;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          {submitSuccess}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="merchant-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nombre del Negocio
          </label>
          <input
            id="merchant-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Pizzería La Trattoria"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo
            </label>
            {renderImageField('Logo', 'logo', logo)}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Banner
            </label>
            {renderImageField('Banner', 'banner', banner)}
          </div>
        </div>

        <fieldset className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
            Etiquetas y descuentos (opcional)
          </legend>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="merchant-promo-label"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Etiqueta promocional
              </label>
              <input
                id="merchant-promo-label"
                type="text"
                list="merchant-promo-suggestions"
                value={promoLabel}
                onChange={(e) => setPromoLabel(e.target.value)}
                placeholder="Ej. 2x1"
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                  fieldErrors.promo_label ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <datalist id="merchant-promo-suggestions">
                {PROMO_LABEL_SUGGESTIONS.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
              {fieldErrors.promo_label && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.promo_label}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="merchant-discount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Descuento (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="merchant-discount"
                    type="number"
                    min={MIN_DISCOUNT_PERCENTAGE}
                    max={MAX_DISCOUNT_PERCENTAGE}
                    step={1}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder="0"
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      fieldErrors.discount_percentage ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formatDiscountBadge(discountInput) !== null && (
                    <span className="shrink-0 rounded-full bg-brand-red px-2.5 py-1 text-xs font-semibold text-white">
                      {formatDiscountBadge(discountInput)}
                    </span>
                  )}
                </div>
                {fieldErrors.discount_percentage && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.discount_percentage}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="merchant-estimated-minutes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tiempo estimado (min)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="merchant-estimated-minutes"
                    type="number"
                    min={1}
                    max={MAX_ESTIMATED_MINUTES}
                    step={1}
                    value={estimatedInput}
                    onChange={(e) => setEstimatedInput(e.target.value)}
                    placeholder="25"
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      fieldErrors.estimated_delivery_minutes
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                  {formatEstimatedDeliveryRange(estimatedInput) !== null && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {formatEstimatedDeliveryRange(estimatedInput)}
                    </span>
                  )}
                </div>
                {fieldErrors.estimated_delivery_minutes && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.estimated_delivery_minutes}
                  </p>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {merchant.slug ? (
          <p className="text-xs text-gray-500">
            Slug público: <span className="font-medium">/{merchant.slug}</span>
          </p>
        ) : null}

        <div className="flex justify-end gap-3 border-t pt-4">
          <button
            type="submit"
            disabled={saving || logo.uploading || banner.uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
