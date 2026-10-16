import type { OrderStatus } from '../../types/database';
import type { MerchantPagoMovilInfo } from '../../services/merchantPaymentService';
import type { DriverProfile, OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import { formatPrice } from '../../types/cart';
import {
  formatElapsedTime,
  formatVes,
  getOrderShortCode,
  toVes,
} from '../../utils/orderBoard';
import {
  getAllowedTransitions,
  getTransitionButtonClass,
  getTransitionLabel,
  isLocalPickupOrder,
  isTerminalOrderStatus,
} from '../../utils/orderStatus';
import { getOrderTypeLabel } from '../../utils/orderType';
import { getPaymentMethodLabel, requiresPaymentProof } from '../../utils/paymentMethod';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderKitchenTicket } from './OrderKitchenTicket';
import { PaymentReconciliationPanel } from './PaymentReconciliationPanel';

/**
 * Tarjeta modular de un pedido: encabezado con código y tiempo, datos del
 * cliente, conciliación de pago, comanda de cocina, totales y acciones.
 *
 * Cada bloque se puede ocultar de forma independiente para que el empleado de
 * caja y el de cocina operen sobre la misma tarjeta sin ver lo que no les
 * corresponde.
 */

export interface OrderTicketCardProps {
  order: OrderWithCustomer;
  drivers: readonly DriverProfile[];
  pagoMovil: MerchantPagoMovilInfo | null;
  bcvRate: number;
  now: Date;
  canOperate: boolean;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onAssignDriver?: (orderId: string, driverId: string | null) => void;
  onOpenDriverAssignment?: (order: OrderWithCustomer) => void;
  onOpenProof: (order: OrderWithCustomer) => void;
  onRequestReference: (order: OrderWithCustomer) => void;
}

function PaymentStateChip({ order }: { order: OrderWithCustomer }) {
  const pending = order.status === 'payment_pending';
  const needsProof = requiresPaymentProof(order.payment_method) && !order.payment_proof_url;
  const label = pending
    ? 'Pago sin validar'
    : needsProof
      ? 'Pago sin comprobante'
      : 'Pago conciliado';

  return (
    <span
      data-testid="payment-state-chip"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        pending || needsProof
          ? 'bg-amber-100 text-amber-800'
          : 'bg-emerald-100 text-emerald-800'
      }`}
    >
      <i
        className={`fa-solid ${pending || needsProof ? 'fa-hourglass-half' : 'fa-circle-check'} text-[10px]`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function CustomerBlock({ order }: { order: OrderWithCustomer }) {
  const profile = order.profiles;
  const phone = profile?.phone?.trim();
  const phoneDigits = phone?.replace(/\D/g, '') ?? '';
  return (
    <section
      aria-label="Datos del cliente"
      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</h3>
        {phone && (
          <a
            href={`tel:+${phoneDigits}`}
            data-testid={`customer-phone-${order.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-brand-red transition-colors hover:bg-red-50"
          >
            <i className="fa-solid fa-phone" aria-hidden="true" />
            {phone}
          </a>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <dt className="text-xs text-slate-500">Nombre</dt>
          <dd className="truncate text-sm font-medium text-slate-900">
            {profile?.full_name ?? `Cliente ${order.customer_id?.slice(0, 6) ?? '—'}`}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">Cédula</dt>
          <dd className="truncate text-sm font-medium text-slate-900">{profile?.ci ?? '—'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">Teléfono</dt>
          <dd className="truncate text-sm font-medium text-slate-900">{phone || '—'}</dd>
        </div>
      </dl>
    </section>
  );
}

function DriverBlock({
  order,
  drivers,
  canOperate,
  onAssignDriver,
  onOpenDriverAssignment,
}: {
  order: OrderWithCustomer;
  drivers: readonly DriverProfile[];
  canOperate: boolean;
  onAssignDriver?: (orderId: string, driverId: string | null) => void;
  onOpenDriverAssignment?: (order: OrderWithCustomer) => void;
}) {
  if (order.type !== 'delivery' || drivers.length === 0) return null;
  const assigned = drivers.find((driver) => driver.id === order.driver_id);

  if (assigned) {
    return (
      <span
        data-testid={`assigned-driver-${order.id}`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
      >
        <i className="fa-solid fa-truck" aria-hidden="true" />
        {assigned.full_name ?? assigned.email ?? 'Repartidor'}
      </span>
    );
  }

  if (!canOperate || isTerminalOrderStatus(order.status) || order.status === 'on_the_way') {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor={`driver-select-${order.id}`} className="sr-only">
        Asignar repartidor
      </label>
      <select
        id={`driver-select-${order.id}`}
        data-testid={`driver-select-${order.id}`}
        defaultValue=""
        onChange={(event) => {
          if (event.target.value && onAssignDriver) onAssignDriver(order.id, event.target.value);
        }}
        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
      >
        <option value="" disabled>
          Asignar Rider
        </option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.full_name ?? driver.email ?? driver.id}
          </option>
        ))}
      </select>
      {onOpenDriverAssignment && (
        <button
          type="button"
          onClick={() => onOpenDriverAssignment(order)}
          data-testid={`assign-driver-${order.id}`}
          title="Más opciones de asignación"
          aria-label={`Más opciones para asignar repartidor del pedido ${order.id}`}
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-500 transition-colors hover:bg-slate-50"
        >
          <i className="fa-solid fa-ellipsis" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function PickupNotice() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700"
      data-testid="pickup-ready-notice"
    >
      <i className="fa-solid fa-store" aria-hidden="true" />
      Listo para retirar. El cliente confirma la entrega desde su app.
    </span>
  );
}

export function OrderTicketCard({
  order,
  drivers,
  pagoMovil,
  bcvRate,
  now,
  canOperate,
  onUpdateStatus,
  onAssignDriver,
  onOpenDriverAssignment,
  onOpenProof,
  onRequestReference,
}: OrderTicketCardProps) {
  const usd = Number(order.total_amount ?? 0);
  const transitions = canOperate
    ? getAllowedTransitions(order.status, order.type).filter(
        (status) => !(status === 'delivered' && order.type === 'delivery'),
      )
    : [];

  return (
    <article
      data-testid={`order-card-${order.id}`}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-bold text-slate-900">
              {getOrderShortCode(order.id)}
            </span>
            <span className="text-xs text-slate-500" data-testid={`elapsed-${order.id}`}>
              {formatElapsedTime(order.created_at, now)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <i
                className={`fa-solid ${order.type === 'delivery' ? 'fa-truck-fast' : 'fa-bag-shopping'} text-[10px] text-slate-400`}
                aria-hidden="true"
              />
              {getOrderTypeLabel(order.type)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{getPaymentMethodLabel(order.payment_method)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <OrderStatusBadge status={order.status} />
          <PaymentStateChip order={order} />
        </div>
      </header>

      <CustomerBlock order={order} />

      <PaymentReconciliationPanel
        order={order}
        pagoMovil={pagoMovil}
        bcvRate={bcvRate}
        canOperate={canOperate}
        onOpenProof={onOpenProof}
        onValidatePayment={(target) => onUpdateStatus(target.id, 'confirmed')}
        onRequestReference={onRequestReference}
      />

      <OrderKitchenTicket order={order} />

      {order.type === 'delivery' && order.delivery_address && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <i className="fa-solid fa-location-dot mt-0.5 text-slate-400" aria-hidden="true" />
          <span className="min-w-0 break-words">{order.delivery_address}</span>
        </p>
      )}

      <footer className="space-y-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total a pagar
          </p>
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">{formatPrice(usd)}</span>
            {bcvRate > 0 && (
              <span className="text-sm font-semibold text-emerald-700">
                {formatVes(toVes(usd, bcvRate))}
              </span>
            )}
          </p>
        </div>

        {order.status === 'ready' && isLocalPickupOrder(order.type) && <PickupNotice />}

        <DriverBlock
          order={order}
          drivers={drivers}
          canOperate={canOperate}
          onAssignDriver={onAssignDriver}
          onOpenDriverAssignment={onOpenDriverAssignment}
        />

        {transitions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {transitions.map((nextStatus) => (
              <button
                key={nextStatus}
                type="button"
                onClick={() => onUpdateStatus(order.id, nextStatus)}
                data-testid={`transition-${order.id}-${nextStatus}`}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${getTransitionButtonClass(nextStatus)}`}
              >
                {getTransitionLabel(nextStatus)}
              </button>
            ))}
          </div>
        )}
      </footer>

      {!canOperate && (
        <p className="text-xs text-slate-400">Solo lectura: tu rol no gestiona pedidos.</p>
      )}
    </article>
  );
}
