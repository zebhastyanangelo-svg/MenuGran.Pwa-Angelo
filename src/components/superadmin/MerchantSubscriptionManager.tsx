/**
 * Control manual de suscripción de un comercio para el SuperAdmin.
 *
 * Permite asignar un plazo (7/15/30/90 días) que se guarda como fecha de
 * expiración (`merchants.subscription_expires_at`) y muestra un contador
 * visual de días restantes. Es solo administrativo/visual: no bloquea nada
 * automáticamente cuando expira.
 */

import { useState } from 'react';
import {
  buildExpirationDateFromDays,
  calculateSubscriptionDaysLeft,
} from '../../utils/subscription';

export interface MerchantSubscriptionManagerProps {
  merchantId: string;
  currentExpiration?: string | null;
  onUpdate: (merchantId: string, newExpirationDate: string) => Promise<void>;
}

const SUBSCRIPTION_TERM_OPTIONS: readonly { label: string; days: number }[] = [
  { days: 7, label: '7 días' },
  { days: 15, label: '15 días' },
  { days: 30, label: '30 días (1 mes)' },
  { days: 90, label: '90 días (3 meses)' },
];

function formatExpirationDate(expiration: string | null | undefined): string {
  if (!expiration) return '—';
  const parsed = new Date(expiration);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function MerchantSubscriptionManager({
  merchantId,
  currentExpiration = null,
  onUpdate,
}: MerchantSubscriptionManagerProps) {
  const [daysToAdd, setDaysToAdd] = useState<number>(30);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysLeft = calculateSubscriptionDaysLeft(currentExpiration);

  const handleSetManualSubscription = async (): Promise<void> => {
    const expirationDate = buildExpirationDateFromDays(daysToAdd);
    if (expirationDate === null) {
      setError('Selecciona un plazo válido.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(merchantId, expirationDate);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo actualizar la suscripción.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-label="Control de suscripción"
      className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
      data-testid="merchant-subscription-manager"
    >
      <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
        <i className="fa-solid fa-calendar-check text-sm text-brand-red" aria-hidden="true" />
        Control de suscripción (SuperAdmin)
      </p>

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-slate-600">Estado actual:</span>
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            daysLeft === null
              ? 'bg-red-100 text-red-700'
              : daysLeft > 5
                ? 'bg-green-100 text-green-700'
                : daysLeft > 0
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
          }`}
          data-testid="subscription-days-badge"
        >
          {daysLeft === null
            ? 'Suscripción expirada / Sin configurar'
            : daysLeft > 0
              ? `${daysLeft} día${daysLeft === 1 ? '' : 's'} restantes`
              : 'Suscripción expirada'}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-slate-600">Expira el:</span>
        <span className="text-sm font-semibold text-slate-900">
          {formatExpirationDate(currentExpiration)}
        </span>
      </div>

      {error !== null && (
        <p
          className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <select
          value={daysToAdd}
          onChange={(event) => setDaysToAdd(Number(event.target.value))}
          className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900"
          aria-label="Plazo de suscripción"
          data-testid="subscription-term-select"
        >
          {SUBSCRIPTION_TERM_OPTIONS.map((option) => (
            <option key={option.days} value={option.days}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void handleSetManualSubscription()}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="subscription-assign-button"
        >
          <i className="fa-solid fa-hourglass-half text-base" aria-hidden="true" />
          {isSaving ? 'Guardando…' : 'Asignar plazo'}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Control visual y administrativo: la expiración no bloquea el comercio.
      </p>
    </section>
  );
}

export default MerchantSubscriptionManager;
