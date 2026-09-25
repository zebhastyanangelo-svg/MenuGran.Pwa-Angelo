import { useMemo, useState } from 'react';
import type { OrderStatus } from '../../types/database';
import type { DriverProfile, OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import { formatPrice } from '../../types/cart';
import { OrderStatusBadge } from './OrderStatusBadge';
import {
  ORDER_STATUS_ORDER,
  getAllowedTransitions,
  getOrderStatusLabel,
  getTransitionButtonClass,
  getTransitionLabel,
  isTerminalOrderStatus,
} from '../../utils/orderStatus';
import { getPaymentMethodLabel, requiresPaymentProof } from '../../utils/paymentMethod';

type PeriodPreset = 'this_month' | 'last_month' | 'today' | 'last_7_days' | 'custom';

interface PeriodOption {
  value: PeriodPreset;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'this_month', label: 'Este Mes' },
  { value: 'last_month', label: 'Mes Pasado' },
  { value: 'today', label: 'Hoy' },
  { value: 'last_7_days', label: 'Últimos 7 días' },
  { value: 'custom', label: 'Mes/Año personalizado' },
];

function getDateRange(preset: PeriodPreset, customMonth?: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_month':
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() - 1);
      end.setDate(0); // last day of previous month
      end.setHours(23, 59, 59, 999);
      break;
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_7_days':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (customMonth) {
        const [year, month] = customMonth.split('-').map(Number);
        start.setFullYear(year, month - 1, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(year, month, 0); // last day of month
        end.setHours(23, 59, 59, 999);
      } else {
        // fallback to this month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      }
      break;
  }
  return { start, end };
}

export interface OrdersBoardProps {
  orders: OrderWithCustomer[];
  drivers?: DriverProfile[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onAssignDriver?: (orderId: string, driverId: string | null) => void;
  onOpenProof: (order: OrderWithCustomer) => void;
}

function getCustomerLabel(order: OrderWithCustomer): string {
  const profile = order.profiles;
  if (profile?.full_name) return profile.full_name;
  if (profile?.email) return profile.email;
  return order.customer_id ? `Cliente ${order.customer_id.slice(0, 6)}...` : 'Cliente General';
}

export function OrdersBoard({
  orders,
  drivers = [],
  onUpdateStatus,
  onAssignDriver,
  onOpenProof,
}: OrdersBoardProps) {
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');
  const [period, setPeriod] = useState<PeriodPreset>('this_month');
  const [customMonth, setCustomMonth] = useState<string>(''); // format YYYY-MM
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { start: periodStart, end: periodEnd } = getDateRange(period, customMonth);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = !filterStatus || order.status === filterStatus;
      const orderDate = new Date(order.created_at);
      const matchesPeriod = orderDate >= periodStart && orderDate <= periodEnd;
      return matchesStatus && matchesPeriod;
    });
  }, [orders, filterStatus, periodStart, periodEnd]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(
    () => filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredOrders, currentPage]
  );

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as PeriodPreset;
    setPeriod(value);
    setPage(1);
    if (value !== 'custom') setCustomMonth('');
  };

  const handleCustomMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomMonth(e.target.value);
    setPage(1);
  };

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Panel de Comercio - Gestión de Pedidos
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
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

          <label
            htmlFor="period-filter"
            className="text-sm font-medium text-gray-700 whitespace-nowrap"
          >
            Período:
          </label>
          <select
            id="period-filter"
            value={period}
            onChange={handlePeriodChange}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {period === 'custom' && (
            <>
              <label
                htmlFor="custom-month"
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                Mes/Año:
              </label>
              <input
                id="custom-month"
                type="month"
                value={customMonth}
                onChange={handleCustomMonthChange}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </>
          )}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          No hay pedidos que mostrar
          {filterStatus ? ` con estado ${getOrderStatusLabel(filterStatus)}` : ''}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
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
              {paginatedOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-gray-200 block sm:table-row hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 block sm:table-cell">
                    {order.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 block sm:table-cell">
                    {getCustomerLabel(order)}
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
                    {requiresPaymentProof(order.payment_method) && (order.payment_proof_url ? (
                      <button
                        type="button"
                        onClick={() => onOpenProof(order)}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded font-medium transition-colors"
                      >
                        Ver comprobante
                      </button>
                    ) : (
                      <span className="mt-1.5 block text-xs text-gray-400 italic">
                        Sin capture
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 block sm:table-cell">
                    <div className="flex flex-wrap items-center gap-2">
                      {order.type === 'delivery' && onAssignDriver && (
                        <div className="w-full mb-1">
                          {order.driver_id ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded font-medium">
                              🚗 {drivers.find((d) => d.id === order.driver_id)?.full_name ?? 'Repartidor'}
                            </span>
                          ) : !isTerminalOrderStatus(order.status) && order.status !== 'on_the_way' ? (
                            <select
                              className="w-full text-xs border border-indigo-200 rounded px-2 py-1 bg-indigo-50 text-indigo-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              data-testid={`driver-select-${order.id}`}
                              defaultValue=""
                              onChange={(e) => {
                                const driverId = e.target.value;
                                if (driverId) {
                                  onAssignDriver(order.id, driverId);
                                }
                              }}
                            >
                              <option value="" disabled>
                                Asignar repartidor
                              </option>
                              {drivers.length === 0 ? (
                                <option value="" disabled className="text-gray-400">
                                  Sin repartidores disponibles
                                </option>
                              ) : (
                                drivers.map((driver) => (
                                  <option key={driver.id} value={driver.id}>
                                    {driver.full_name ?? driver.email ?? driver.id}
                                  </option>
                                ))
                              )}
                            </select>
                          ) : null}
                        </div>
                      )}
                      {!isTerminalOrderStatus(order.status) &&
                        getAllowedTransitions(order.status).filter(s => s !== 'delivered').map((nextStatus) => (
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Anterior
              </button>
              <button
                onClick={goNext}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
