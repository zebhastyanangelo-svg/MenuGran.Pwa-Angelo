import type { MerchantPagoMovilInfo } from '../../services/merchantPaymentService';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import { formatPrice } from '../../types/cart';
import { formatVes, getPaymentValidationState, toVes } from '../../utils/orderBoard';
import { getPaymentMethodLabel, requiresPaymentProof } from '../../utils/paymentMethod';

/**
 * Conciliación de Pago Móvil.
 *
 * El cajero necesita, en una sola vista, los datos bancarios contra los que
 * compara el capture del cliente y las dos acciones de resolución: aprobar el
 * pago y enviar el pedido a cocina, o devolverle el pedido al cliente pidiendo
 * una referencia legible.
 */

export interface PaymentReconciliationPanelProps {
  order: OrderWithCustomer;
  pagoMovil: MerchantPagoMovilInfo | null;
  bcvRate: number;
  canOperate: boolean;
  onOpenProof: (order: OrderWithCustomer) => void;
  onValidatePayment: (order: OrderWithCustomer) => void;
  onRequestReference: (order: OrderWithCustomer) => void;
}

interface BankFieldProps {
  label: string;
  value: string | null | undefined;
  fallback?: string;
}

function BankField({ label, value, fallback = 'No configurado' }: BankFieldProps) {
  const resolved = value?.trim() || fallback;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="truncate text-sm font-medium text-slate-900">{resolved}</dd>
    </div>
  );
}

function ProofTile({ order, onOpenProof }: { order: OrderWithCustomer; onOpenProof: PaymentReconciliationPanelProps['onOpenProof'] }) {
  if (!order.payment_proof_url) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs italic text-slate-400">
        El cliente no adjuntó comprobante
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpenProof(order)}
      data-testid={`proof-button-${order.id}`}
      aria-label={`Ampliar comprobante del pedido ${order.id}`}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-brand-red hover:bg-red-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-brand-red shadow-sm">
        <i className="fa-solid fa-image text-lg" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">Comprobante adjunto</span>
        <span className="block text-xs text-slate-500">Toca para ampliar la imagen</span>
      </span>
      <i
        className="fa-solid fa-up-right-and-down-left-from-center ml-auto text-xs text-slate-400 group-hover:text-brand-red"
        aria-hidden="true"
      />
    </button>
  );
}

function ValidationAlert({ order, bcvRate }: { order: OrderWithCustomer; bcvRate: number }) {
  const state = getPaymentValidationState(order);
  const rateNote = bcvRate > 0 ? 'Tasa oficial BCV sincronizada' : 'Tasa BCV no disponible';

  if (state === 'validated') {
    return (
      <p
        className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-800"
        data-testid="payment-validated-alert"
      >
        <i className="fa-solid fa-circle-check mt-0.5" aria-hidden="true" />
        <span>
          Monto conciliado por caja · {rateNote}
        </span>
      </p>
    );
  }

  if (state === 'missing_reference') {
    return (
      <p
        className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-800"
        data-testid="payment-missing-reference-alert"
      >
        <i className="fa-solid fa-triangle-exclamation mt-0.5" aria-hidden="true" />
        <span>Falta la referencia bancaria: solicítala al cliente para poder validar.</span>
      </p>
    );
  }

  return (
    <p
      className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800"
      data-testid="payment-awaiting-alert"
    >
      <i className="fa-solid fa-hourglass-half mt-0.5" aria-hidden="true" />
      <span>
        Pendiente de validación contra el banco · {rateNote}
      </span>
    </p>
  );
}

function ReconciliationActions({
  order,
  canOperate,
  onValidatePayment,
  onRequestReference,
}: Pick<
  PaymentReconciliationPanelProps,
  'order' | 'canOperate' | 'onValidatePayment' | 'onRequestReference'
>) {
  if (!canOperate) return null;
  const isPending = order.status === 'payment_pending';
  if (!isPending) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={() => onValidatePayment(order)}
        data-testid={`validate-payment-${order.id}`}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        Validar Pago y Enviar a Cocina
      </button>
      <button
        type="button"
        onClick={() => onRequestReference(order)}
        data-testid={`request-reference-${order.id}`}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
      >
        <i className="fa-regular fa-comment-dots" aria-hidden="true" />
        Solicitar Referencia Correcta
      </button>
    </div>
  );
}

/** Datos bancarios del comercio contra los que se compara el capture. */
function BankDataGrid({
  order,
  pagoMovil,
}: {
  order: OrderWithCustomer;
  pagoMovil: MerchantPagoMovilInfo | null;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <BankField label="Banco emisor" value={pagoMovil?.bank} />
      <BankField label="Teléfono receptor" value={pagoMovil?.phone} />
      <BankField label="Cédula / RIF" value={pagoMovil?.idNumber} />
      <BankField label="Referencia" value={order.payment_reference} fallback="Sin referencia" />
    </dl>
  );
}

/** Montos que el cajero necesita ver siempre, sea cual sea el método de pago. */
function AmountGrid({ order, bcvRate }: { order: OrderWithCustomer; bcvRate: number }) {
  const usd = Number(order.total_amount ?? 0);
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">Monto (USD)</dt>
        <dd className="truncate text-sm font-semibold text-slate-900">{formatPrice(usd)}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">Monto (Bs.)</dt>
        <dd className="truncate text-sm font-semibold text-emerald-700">
          {bcvRate > 0 ? formatVes(toVes(usd, bcvRate)) : '—'}
        </dd>
      </div>
      {order.delivery_fee && Number(order.delivery_fee) > 0 && (
        <div className="min-w-0">
          <dt className="text-xs font-medium text-slate-500">Envío</dt>
          <dd className="truncate text-sm font-medium text-slate-700">
            {formatPrice(order.delivery_fee)}
          </dd>
        </div>
      )}
    </dl>
  );
}

function ReconciliationSection({
  order,
  pagoMovil,
  bcvRate,
  onOpenProof,
}: {
  order: OrderWithCustomer;
  pagoMovil: MerchantPagoMovilInfo | null;
  bcvRate: number;
  onOpenProof: PaymentReconciliationPanelProps['onOpenProof'];
}) {
  if (!requiresPaymentProof(order.payment_method)) {
    return (
      <p className="text-xs text-slate-500">
        Cobro directo en {getPaymentMethodLabel(order.payment_method).toLowerCase()}: no requiere
        comparar contra el banco.
      </p>
    );
  }
  return (
    <>
      <ProofTile order={order} onOpenProof={onOpenProof} />
      <BankDataGrid order={order} pagoMovil={pagoMovil} />
      <ValidationAlert order={order} bcvRate={bcvRate} />
    </>
  );
}

export function PaymentReconciliationPanel({
  order,
  pagoMovil,
  bcvRate,
  canOperate,
  onOpenProof,
  onValidatePayment,
  onRequestReference,
}: PaymentReconciliationPanelProps) {
  return (
    <section
      aria-label="Conciliación de pago"
      data-testid="payment-reconciliation-panel"
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Conciliación de pago · {getPaymentMethodLabel(order.payment_method)}
      </h3>

      <AmountGrid order={order} bcvRate={bcvRate} />

      <ReconciliationSection
        order={order}
        pagoMovil={pagoMovil}
        bcvRate={bcvRate}
        onOpenProof={onOpenProof}
      />

      <ReconciliationActions
        order={order}
        canOperate={canOperate}
        onValidatePayment={onValidatePayment}
        onRequestReference={onRequestReference}
      />
    </section>
  );
}
