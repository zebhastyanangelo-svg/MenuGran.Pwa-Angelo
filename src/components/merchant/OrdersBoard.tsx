import { useMemo, useState } from 'react';
import type { OrderRow, OrderStatus } from '../../types/database';
import { formatPrice } from '../../types/cart';
import { OrderStatusBadge } from './OrderStatusBadge';
import {
  ORDER_STATUS_ORDER,
  getAllowedTransitions,
  getOrderStatusLabel,
  getTransitionButtonClass,
  getTransitionLabel,
} from '../../utils/orderStatus';

export interface OrdersBoardProps {
  orders: OrderRow[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onOpenProof: (order: OrderRow) => void;
}

function getPaymentMethodLabel(method: OrderRow['payment_method']): string {
  switch (method) {
    case 'pago_movil':
      return 'Pago Móvil';
    case 'cash':
      return 'Efectivo';
    case 'zelle':
      return 'Zelle';
    case 'card':
      return 'Tarjeta';
    default:
      return method;
  }
}

function getCustomerLabel(customerId: string | null): string {
  return customerId ? `Cliente ${customerId.slice(0, 6)}...` : 'Cliente General';
}

export function OrdersBoard({
  orders,
  onUpdateStatus,
  onOpenProof,
}: OrdersBoardProps) {
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) => !filterStatus || order.status === filterStatus
      ),
    [orders, filterStatus]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Panel de Comercio - Gestión de Pedidos
        </h1>
        <div className="flex items-center gap-3">
          <label
            htmlFor="status-filter"
            className="text-sm font-medium text-gray-700 whitespace-nowrap"
          >
            Filtrar por estado:
          </label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as OrderStatus)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Todos los estados</option>
            {ORDER_STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          No hay pedidos que mostrar
          {filterStatus ? ` con estado ${getOrderStatusLabel(filterStatus)}` : ''}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left border-collapse block sm:table">
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-gray-200 bg-gray-50">
                {['ID', 'Cliente', 'Total', 'Estado', 'Pago', 'Acciones'].map(
                  (head) => (
                    <th
                      key={head}
                      className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide"
                    >
                      {head}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-gray-200 block sm:table-row hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 block sm:table-cell">
                    {order.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 block sm:table-cell">
                    {getCustomerLabel(order.customer_id)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 block sm:table-cell">
                    {formatPrice(order.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm block sm:table-cell">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-sm block sm:table-cell">
                    <span className="font-medium">
                      {getPaymentMethodLabel(order.payment_method)}
                    </span>
                    {order.payment_reference && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        Ref: {order.payment_reference}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 block sm:table-cell">
                    <div className="flex flex-wrap items-center gap-2">
                      {order.payment_proof_url && (
                        <button
                          type="button"
                          onClick={() => onOpenProof(order)}
                          className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded font-medium transition-colors"
                        >
                          Ver comprobante
                        </button>
                      )}
                      {getAllowedTransitions(order.status).map((nextStatus) => (
                        <button
                          key={nextStatus}
                          type="button"
                          onClick={() => onUpdateStatus(order.id, nextStatus)}
                          className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${getTransitionButtonClass(
                            nextStatus
                          )}`}
                        >
                          {getTransitionLabel(nextStatus)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
