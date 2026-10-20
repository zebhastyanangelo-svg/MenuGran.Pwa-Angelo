/**
 * Editor de tramos de tarifa de delivery por distancia.
 *
 * Permite al comercio crear, editar y eliminar tramos tipo:
 *   "0 - 5 km: $2.00"
 *   "5 - 15 km: $4.00"
 *
 * Los tramos no deben solapar y deben cubrir desde 0 km.
 */
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { DeliveryFeeTierRow } from '../../types/database';
import type { DeliveryFeeTierInput } from '../../services/deliveryFeeTiersService';
import { formatFeeTier, validateDeliveryFeeTiers } from '../../utils/deliveryFeeTiers';

interface DeliveryFeeTiersEditorProps {
  tiers: DeliveryFeeTierRow[];
  loading: boolean;
  error: string | null;
  onAdd: (input: DeliveryFeeTierInput) => Promise<void>;
  onEdit: (tierId: string, input: DeliveryFeeTierInput) => Promise<void>;
  onRemove: (tierId: string) => Promise<void>;
}

interface FormState {
  minKm: string;
  maxKm: string;
  fee: string;
}

const EMPTY_FORM: FormState = { minKm: '', maxKm: '', fee: '' };

export function DeliveryFeeTiersEditor({
  tiers,
  loading,
  error: serviceError,
  onAdd,
  onEdit,
  onRemove,
}: DeliveryFeeTiersEditorProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (tier: DeliveryFeeTierRow) => {
    setEditingId(tier.id);
    setForm({
      minKm: String(tier.min_km),
      maxKm: String(tier.max_km),
      fee: String(tier.fee),
    });
    setError(null);
  };

  /**
   * Validación local del formulario: números finitos, rango coherente y
   * tarifa no negativa. Devuelve el mensaje de error o `null` si es válido.
   */
  const validateTierInput = (
    minKm: number,
    maxKm: number,
    fee: number,
  ): string | null => {
    if (!Number.isFinite(minKm) || !Number.isFinite(maxKm) || !Number.isFinite(fee)) {
      return 'Todos los campos deben ser valores numéricos.';
    }
    if (minKm < 0 || maxKm <= minKm) {
      return 'El rango debe ser válido: mínimo ≥ 0 y máximo > mínimo.';
    }
    if (fee < 0) {
      return 'La tarifa no puede ser negativa.';
    }
    return null;
  };

  /** Tramos existentes (excluyendo el que se edita) para validar solapamientos. */
  const collectTiersForValidation = (): DeliveryFeeTierInput[] =>
    tiers
      .filter((t) => editingId === null || t.id !== editingId)
      .map((t) => ({ minKm: t.min_km, maxKm: t.max_km, fee: t.fee }));

  /**
   * Guarda el tramo del formulario: inserta (onAdd) o actualiza (onEdit)
   * según el modo, con estado de carga y manejo de errores.
   */
  const submitTier = async () => {
    if (saving) return;

    const minKm = Number(form.minKm);
    const maxKm = Number(form.maxKm);
    const fee = Number(form.fee);

    const inputError = validateTierInput(minKm, maxKm, fee);
    if (inputError) {
      setError(inputError);
      return;
    }

    const newTier: DeliveryFeeTierInput = { minKm, maxKm, fee };
    const validation = validateDeliveryFeeTiers([
      ...collectTiersForValidation(),
      newTier,
    ]);
    if (!validation.isValid) {
      setError(validation.errors.join(' '));
      return;
    }

    setSaving(true);
    try {
      if (editingId !== null) {
        await onEdit(editingId, newTier);
      } else {
        await onAdd(newTier);
      }
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el tramo.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * El editor vive dentro del `<form>` de la página de configuración, así que
   * el botón NO puede ser `type="submit"` de un formulario anidado: el evento
   * `submit` burbujearía y dispararía el guardado de toda la página (o una
   * recarga de la PWA). Se cancela el comportamiento por defecto y se guarda
   * de forma explícita.
   */
  const handleSubmitClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void submitTier();
  };

  /**
   * Enter en los inputs del tramo también haría "implicit submission" del
   * formulario contenedor; se cancela y se guarda el tramo en su lugar.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    void submitTier();
  };

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none';

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-800">
          Tarifas por distancia (opcional)
        </h4>
        <p className="mt-1 text-xs text-gray-500">
          Define tramos de tarifa según la distancia del cliente. Si no configuras
          tramos, se usa la tarifa plana de arriba.
        </p>
        {loading && (
          <p className="mt-2 text-xs text-gray-500" role="status">
            Cargando tramos...
          </p>
        )}
        {serviceError && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {serviceError}
          </p>
        )}
      </div>

      {tiers.length > 0 && (
        <ul className="space-y-2" data-testid="delivery-fee-tiers-list">
          {tiers.map((tier) => (
            <li
              key={tier.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-700">
                {formatFeeTier(tier)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(tier)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(tier.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/*
        Sin `<form>`: este editor se renderiza dentro del formulario de la
        página y un form anidado es HTML inválido cuyo evento `submit`
        burbujea y dispara el guardado completo (o recarga la PWA). El
        guardado se hace explícito desde el onClick del botón.
      */}
      <div
        className="space-y-3 rounded-md border border-gray-200 p-3"
        onKeyDown={handleKeyDown}
      >
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="tier-min-km" className="block text-xs font-medium text-gray-600 mb-1">
              Desde (km)
            </label>
            <input
              id="tier-min-km"
              type="number"
              min="0"
              step="0.1"
              value={form.minKm}
              onChange={(e) => setForm((p) => ({ ...p, minKm: e.target.value }))}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="tier-max-km" className="block text-xs font-medium text-gray-600 mb-1">
              Hasta (km)
            </label>
            <input
              id="tier-max-km"
              type="number"
              min="0"
              step="0.1"
              value={form.maxKm}
              onChange={(e) => setForm((p) => ({ ...p, maxKm: e.target.value }))}
              placeholder="5"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="tier-fee" className="block text-xs font-medium text-gray-600 mb-1">
              Tarifa ($)
            </label>
            <input
              id="tier-fee"
              type="number"
              min="0"
              step="0.01"
              value={form.fee}
              onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))}
              placeholder="2.00"
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving
              ? 'Guardando...'
              : editingId !== null
                ? 'Guardar cambios'
                : 'Agregar tramo'}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
