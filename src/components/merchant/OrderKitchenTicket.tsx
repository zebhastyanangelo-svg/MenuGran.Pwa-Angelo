import type { OrderItem } from '../../types/database';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';

/**
 * Comanda de cocina con las modificaciones del cliente.
 *
 * Los ingredientes que el cliente tachó se repiten tachados para que el cocineros
 * los lea de un vistazo sin comparar contra la carta, y cualquier línea
 * personalizada se marca como tal para que la cocina no la prepare por defecto.
 */

export interface OrderKitchenTicketProps {
  order: OrderWithCustomer;
}

/** Nombre del platillo en la comanda. */
export function getKitchenItemLabel(item: OrderItem): string {
  const title = item.title?.trim();
  return title && title.length > 0 ? title : `Producto #${item.product_id.slice(0, 8)}`;
}

/** `true` cuando el cliente personalizó la línea (tachó ingredientes o dejó nota). */
export function isKitchenItemModified(item: OrderItem): boolean {
  return (item.excluded_ingredients?.length ?? 0) > 0 || (item.notes?.trim().length ?? 0) > 0;
}

/** `true` si alguna línea del pedido lleva customization del cliente. */
export function hasCustomizedItems(order: OrderWithCustomer): boolean {
  return order.items.some(isKitchenItemModified);
}

function ModifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
      data-testid="customized-order-badge"
    >
      <i className="fa-solid fa-pen-ruler text-[10px]" aria-hidden="true" />
      Modificado por Cliente
    </span>
  );
}

function KitchenItemRow({ item }: { item: OrderItem }) {
  const excluded = item.excluded_ingredients ?? [];
  const notes = item.notes?.trim() ?? '';
  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">
        {item.quantity} × {getKitchenItemLabel(item)}
      </p>
      {excluded.length > 0 && (
        <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-red-700">
          <i className="fa-solid fa-circle-minus mt-0.5 text-xs" aria-hidden="true" />
          <span>
            Sin: <span className="line-through">{excluded.join(', ')}</span>
          </span>
        </p>
      )}
      {notes.length > 0 && (
        <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-800">
          <i className="fa-solid fa-note-sticky mt-0.5 text-xs" aria-hidden="true" />
          <span>
            Nota: <span className="font-medium">{notes}</span>
          </span>
        </p>
      )}
    </li>
  );
}

export function OrderKitchenTicket({ order }: OrderKitchenTicketProps) {
  if (order.items.length === 0) return null;
  return (
    <section aria-label="Comanda de cocina" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Comanda
        </h3>
        {hasCustomizedItems(order) && <ModifiedBadge />}
      </div>
      <ul className="space-y-2" data-testid="order-items-list">
        {order.items.map((item, index) => (
          <KitchenItemRow key={`${item.product_id}-${index}`} item={item} />
        ))}
      </ul>
    </section>
  );
}
