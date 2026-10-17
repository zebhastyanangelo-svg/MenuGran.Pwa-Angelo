import type { MerchantPagoMovilInfo } from '../../services/merchantPaymentService';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import { formatPrice } from '../../types/cart';
import { formatVES } from '../../utils/format';
import { getPaymentValidationState, toVes } from '../../utils/orderBoard';
import { getPaymentMethodLabel, requiresPaymentProof } from '../../utils/paymentMethod';
import { findVenezuelanBank, resolveVenezuelanBankName } from '../../utils/venezuelanBanks';

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
  /** Código de institución, cuando el dato corresponde a un banco del catálogo. */
  code?: string;
}

function BankField({ label, value, fallback = 'No configurado', code }: BankFieldProps) {
  const resolved = value?.trim() || fallback;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium text-slate-900">
        {resolved}
        {code && <span className="ml-1 font-normal text-slate-400">({code})</span>}
      </dd>
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

/**
 * Datos del pago que reportó el cliente en el checkout.
 *
 * Es lo que el cajero contrasta contra el movimiento que le llega al banco:
 * el banco emisor puede diferir del receptor porque el cliente transfiere desde
 * su propia cuenta, y teléfono y cédula son la clave con la que el banco localiza
 * la operación. La referencia la escribió el cliente al confirmar el pago.
 *
 * Antes vivían repartidos entre la cuenta receptora del comercio y una sección
 * aparte titulada "Datos de quien paga", que enterraba el banco emisor —el dato
 * más consultado— bajo un encabezado redundante. Ahora los cuatro datos
 * declarados conviven en una sola rejilla, en el mismo plano visual.
 */
function ReconciliationDataGrid({ order }: { order: OrderWithCustomer }) {
  // El banco se muestra con su nombre canónico y el código de institución: es lo
  // que el cajero contrasta contra el capture cuando el dato se guardó como
  // texto libre ("Provincial", "BDV") antes de que existiera el selector.
  const bank = resolveVenezuelanBankName(order.payer_bank);
  const bankCode = bank ? findVenezuelanBank(bank)?.code : undefined;

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="payment-reported-data">
      <BankField label="Banco" value={bank} fallback="No indicado" code={bankCode} />
      <BankField label="Teléfono" value={order.payer_phone} fallback="No indicado" />
      <BankField
        label="Cédula / RIF"
        value={order.payer_id_number}
        fallback="No indicado"
      />
      <BankField label="Referencia" value={order.payment_reference} fallback="Sin referencia" />
    </dl>
  );
}

/** Montos que el cajero necesita ver siempre, sea cual sea el método de pago. */
function AmountGrid({ order, bcvRate }: { order: OrderWithCustomer; bcvRate: number }) {
  const usd = Number(order.total_amount ?? 0);
  // La columna llega como `numeric`: PostgREST la devuelve como número, así que
  // `order.delivery_fee` puede ser el número `0`. Con `{order.delivery_fee && …}`
  // React pintaba ese `0` suelto debajo del monto en bolívares. Se compara ya
  // convertido para que la expresión sea siempre booleana.
  const deliveryFee = Number(order.delivery_fee ?? 0);
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="payment-amounts">
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">Monto (USD)</dt>
        <dd className="truncate text-sm font-semibold text-slate-900">{formatPrice(usd)}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">Monto (Bs.)</dt>
        <dd className="truncate text-sm font-semibold text-emerald-700">
          {bcvRate > 0 ? formatVES(toVes(usd, bcvRate)) : '—'}
        </dd>
      </div>
      {deliveryFee > 0 && (
        <div className="min-w-0">
          <dt className="text-xs font-medium text-slate-500">Envío</dt>
          <dd className="truncate text-sm font-medium text-slate-700">
            {formatPrice(deliveryFee)}
          </dd>
        </div>
      )}
    </dl>
  );
}

function ReconciliationSection({
  order,
  bcvRate,
  onOpenProof,
}: {
  order: OrderWithCustomer;
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
      <ReconciliationDataGrid order={order} />
      <ValidationAlert order={order} bcvRate={bcvRate} />
    </>
  );
}

export function PaymentReconciliationPanel({
  order,
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
