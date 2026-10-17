import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PaymentMethod, OrderStatus, UserRole, MerchantStaffPermissions } from '../../types/database';
import type { MerchantPagoMovilInfo } from '../../services/merchantPaymentService';
import type { DriverProfile, OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { OrdersFilterBar } from './OrdersFilterBar';
import { OrdersKpiGrid } from './OrdersKpiGrid';
import { OrderTicketCard } from './OrderTicketCard';
import {
  collectAvailablePaymentMethods,
  countOrdersByTab,
  filterOrdersByFacets,
  filterOrdersByTab,
  formatBoardDateLabel,
  getOrderBoardDateRange,
  getOrderBoardKpis,
  type OrderBoardPeriod,
  type OrderBoardTabKey,
} from '../../utils/orderBoard';
import {
  canOperateBoard,
  canViewBoardFinances,
  isBoardPermissionsLoading,
} from '../../utils/orderBoardPermissions';
import { requiresPaymentProof } from '../../utils/paymentMethod';

/**
 * Tablero de Pedidos en Vivo del comercio.
 *
 * Es la vista de trabajo de caja y cocina: cuatro tarjetas de resumen, filtros
 * con contadores y una tarjeta modular por pedido. El componente no consulta
 * datos por su cuenta —los recibe de `useMerchantDashboardPage`, que ya
 * mantiene la suscripción Realtime de Supabase— y solo aplica el corte por rol
 * que corresponde a cada usuario.
 */

const PAGE_SIZE = 8;
const ELAPSED_TICK_MS = 60_000;

export interface OrdersBoardProps {
  orders: OrderWithCustomer[];
  drivers?: readonly DriverProfile[];
  role: UserRole | null;
  staffPermissions: MerchantStaffPermissions | null;
  /** `true` mientras los permisos del empleado siguen en vuelo o fallaron. */
  permissionsPending?: boolean;
  pagoMovil?: MerchantPagoMovilInfo | null;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onAssignDriver?: (orderId: string, driverId: string | null) => void;
  onOpenDriverAssignment?: (order: OrderWithCustomer) => void;
  onOpenProof: (order: OrderWithCustomer) => void;
  onRequestReference?: (order: OrderWithCustomer) => void;
  onSync?: () => void | Promise<void>;
}

export function OrdersBoard({
  orders,
  drivers = [],
  role,
  staffPermissions,
  permissionsPending = false,
  pagoMovil = null,
  onUpdateStatus,
  onAssignDriver,
  onOpenDriverAssignment,
  onOpenProof,
  onRequestReference,
  onSync,
}: OrdersBoardProps) {
  const { rate, refresh, lastUpdated } = useExchangeRate();
  const bcvRate = rate ?? 0;

  const [activeTab, setActiveTab] = useState<OrderBoardTabKey>('payment_pending');
  const [period, setPeriod] = useState<OrderBoardPeriod>('today');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);

  const canOperate = canOperateBoard(role, staffPermissions);
  const canSeeFinances = canViewBoardFinances(role);
  // Mientras los permisos del empleado se resuelven no se puede afirmar que el
  // tablero sea de solo lectura: avisarlo ahí alarmaba al empleado que sí tiene
  // el permiso, solo que la consulta aún no había respondido.
  const permissionsLoading = isBoardPermissionsLoading(role, permissionsPending);

  // Reloj de un minuto para que el "Hace 4 min" no se quede congelado.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ELAPSED_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const range = useMemo(() => getOrderBoardDateRange(period), [period]);

  const facetedOrders = useMemo(
    () => filterOrdersByFacets(orders, { query, paymentMethod, range }),
    [orders, query, paymentMethod, range],
  );

  const visibleOrders = useMemo(
    () => filterOrdersByTab(facetedOrders, activeTab),
    [facetedOrders, activeTab],
  );

  const counts = useMemo(() => countOrdersByTab(facetedOrders), [facetedOrders]);
  const kpis = useMemo(() => getOrderBoardKpis(orders, bcvRate), [orders, bcvRate]);
  const availablePaymentMethods = useMemo(
    () => collectAvailablePaymentMethods(orders),
    [orders],
  );

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(
    () => visibleOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [visibleOrders, currentPage],
  );

  const pendingProofOrder = useMemo(
    () => orders.find((order) => requiresPaymentProof(order.payment_method) && order.payment_proof_url),
    [orders],
  );

  const resetToFirstPage = useCallback(() => setPage(1), []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await refresh();
      await onSync?.();
    } finally {
      setIsSyncing(false);
    }
  }, [refresh, onSync]);

  const rateLabel = lastUpdated
    ? `Tasa BCV: 1 USD = ${bcvRate.toFixed(2)} Bs.`
    : 'Sincronizando tasa BCV…';

  return (
    <section className="space-y-4" data-testid="orders-board">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Tablero de Pedidos en Vivo
            </h1>
            <span
              data-testid="live-badge"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
              En tiempo real
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {formatBoardDateLabel(now)} · {rateLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSync && (
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={isSyncing}
              data-testid="board-sync"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <i
                className={`fa-solid fa-rotate ${isSyncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Sincronizar
            </button>
          )}
        </div>
      </header>

      <OrdersKpiGrid
        kpis={kpis}
        canSeeFinances={canSeeFinances}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          resetToFirstPage();
        }}
        hasPendingProof={Boolean(pendingProofOrder) && canOperate}
        onOpenFirstPendingProof={
          pendingProofOrder ? () => onOpenProof(pendingProofOrder) : undefined
        }
      />

      <OrdersFilterBar
        counts={counts}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          resetToFirstPage();
        }}
        period={period}
        onPeriodChange={(value) => {
          setPeriod(value);
          resetToFirstPage();
        }}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={(value) => {
          setPaymentMethod(value);
          resetToFirstPage();
        }}
        availablePaymentMethods={availablePaymentMethods}
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          resetToFirstPage();
        }}
        resultCount={visibleOrders.length}
      />

      {visibleOrders.length === 0 ? (
        <p
          className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"
          role="status"
        >
          No hay pedidos que coincidan con los filtros seleccionados.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {paginatedOrders.map((order) => (
              <li key={order.id}>
                <OrderTicketCard
                  order={order}
                  drivers={drivers}
                  pagoMovil={pagoMovil}
                  bcvRate={bcvRate}
                  now={now}
                  canOperate={canOperate}
                  permissionsLoading={permissionsLoading}
                  onUpdateStatus={onUpdateStatus}
                  onAssignDriver={onAssignDriver}
                  onOpenDriverAssignment={onOpenDriverAssignment}
                  onOpenProof={onOpenProof}
                  onRequestReference={onRequestReference ?? (() => undefined)}
                />
              </li>
            ))}
          </ul>

          <nav
            aria-label="Paginación de pedidos"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <span className="text-sm text-slate-600">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
