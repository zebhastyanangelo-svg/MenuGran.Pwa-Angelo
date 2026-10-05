import { Bike, Receipt, ShoppingBag, Ticket } from 'lucide-react';
import { formatUSD, formatVES } from '../../utils/format';
import { isDeliveryFeeCharged } from '../../utils/deliveryPolicy';
import type { CartItem } from '../../types/cart';
import type { OrderType } from '../../types/database';

export interface OrderTicketProps {
  /** Ítems del carrito, para listar las líneas del ticket. */
  items: readonly CartItem[];
  /** Subtotal en USD (solo productos). */
  subtotal: number;
  /** Tarifa de envío en USD ya resuelta para el tipo de despacho elegido. */
  deliveryFee: number;
  /** Tipo de despacho del pedido; determina si la línea de envío aplica. */
  orderType: OrderType;
  /** Tasa BCV (Bs. por USD). `0` mientras carga o si no hay tasa disponible. */
  bcvRate: number;
  /** Total en USD: subtotal + envío. */
  total: number;
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Ticket de venta del cliente.
 *
 * Muestra el desglose (subtotal, envío, cargos y cupón) y el total en las dos
 * monedas en las que el cliente razona: dólares, que es como se guarda el
 * precio, y bolívares, que es como se paga. La tasa BCV se muestra siempre
 * que esté disponible para que el equivalente sea auditable.
 *
 * Cuando el envío no se cobra la línea dice por qué ("Gratis" para delivery
 * sin tarifa, "No aplica" para retiro en local) en lugar de omitirse: el
 * cliente debe poder distinguir "gratis" de "no se cobró".
 */
export function OrderTicket({
  items,
  subtotal,
  deliveryFee,
  orderType,
  bcvRate,
  total,
}: OrderTicketProps) {
  const hasRate = bcvRate > 0;
  const totalVES = hasRate ? total * bcvRate : 0;
  const deliveryApplies = orderType === 'delivery';
  const deliveryIsFree = !isDeliveryFeeCharged(deliveryFee);

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h2 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
        <ShoppingBag className="h-4 w-4 text-brand-red" aria-hidden="true" />
        Resumen ({items.reduce((sum, item) => sum + item.quantity, 0)} ítems)
      </h2>

      <div className="p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const lineTotalUSD = parseFloat(item.product.price) * item.quantity;
            return (
              <li
                key={item.product.id}
                className="flex flex-col gap-0.5 text-sm text-gray-600"
              >
                <span className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {item.quantity} × {item.product.title}
                  </span>
                  <span className="shrink-0">{formatUSD(lineTotalUSD)}</span>
                </span>
                {hasRate && (
                  <span className="ml-4 text-xs text-emerald-700">
                    ≈ {formatVES(lineTotalUSD * bcvRate)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <dl className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <SummaryRow
            icon={
              <ShoppingBag
                className="h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
            }
            label="Subtotal"
          >
            {formatUSD(subtotal)}
          </SummaryRow>

          <SummaryRow
            icon={
              <Bike className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            }
            label="Envío"
          >
            {!deliveryApplies ? (
              <span className="text-slate-500">No aplica (retiro en local)</span>
            ) : deliveryIsFree ? (
              <span className="font-semibold text-emerald-700">Gratis</span>
            ) : (
              <span data-testid="ticket-delivery-fee">
                {formatUSD(deliveryFee)}
              </span>
            )}
          </SummaryRow>

          <SummaryRow
            icon={
              <Receipt
                className="h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
            }
            label="Tarifa de servicio"
          >
            Sin cargos
          </SummaryRow>

          <SummaryRow
            icon={
              <Ticket className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            }
            label="Cupón"
          >
            No aplicado
          </SummaryRow>
        </dl>

        <div className="mt-3 flex flex-col gap-0.5 border-t border-slate-100 pt-2 text-sm font-bold text-gray-900">
          <div className="flex justify-between gap-2">
            <span>Total</span>
            <span data-testid="ticket-total-usd">{formatUSD(total)}</span>
          </div>
          {hasRate && (
            <>
              <span
                className="ml-4 text-base font-semibold text-emerald-700"
                data-testid="ticket-total-ves"
              >
                ≈ {formatVES(totalVES)}
              </span>
              <span className="mt-0.5 ml-4 text-[11px] font-normal text-slate-500">
                Tasa BCV aplicada: Bs. {bcvRate.toFixed(2)} / USD
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}