import type { OrderBoardKpis, OrderBoardTabKey } from '../../utils/orderBoard';
import { formatVes } from '../../utils/orderBoard';
import { formatPrice } from '../../types/cart';

/**
 * Tarjetas de resumen de la cabecera del Tablero de Pedidos en Vivo.
 *
 * Las tres primeras son operativas y las ve todo el personal del comercio; la
 * de ventas del día es la única que resume dinero del negocio y se oculta para
 * el empleado sin acceso a finanzas.
 */

export interface OrdersKpiGridProps {
  kpis: OrderBoardKpis;
  /** El empleado sin permiso de finanzas no ve el total de ventas del día. */
  canSeeFinances: boolean;
  activeTab: OrderBoardTabKey;
  onSelectTab: (tab: OrderBoardTabKey) => void;
  onOpenFirstPendingProof?: () => void;
  hasPendingProof?: boolean;
}

interface KpiCardShellProps {
  testId: string;
  label: string;
  icon: string;
  accent: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function KpiCardShell({
  testId,
  label,
  icon,
  accent,
  active,
  onClick,
  children,
}: KpiCardShellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={`kpi-${testId}`}
      className={`min-w-0 rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors ${
        active ? 'border-brand-red ring-1 ring-brand-red' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`shrink-0 ${accent}`} aria-hidden="true">
          <i className={`fa-solid ${icon} text-base`} />
        </span>
        <p className="min-w-0 truncate text-sm font-medium text-slate-500">{label}</p>
      </div>
      <div className="mt-2">{children}</div>
    </button>
  );
}

interface MoneyLineProps {
  usd: number;
  ves: number;
}

function MoneyLine({ usd, ves }: MoneyLineProps) {
  return (
    <>
      <p className="truncate text-2xl font-bold text-slate-900">{formatPrice(usd)}</p>
      {ves > 0 && (
        <p className="truncate text-xs font-medium text-emerald-700">{formatVes(ves)}</p>
      )}
    </>
  );
}

export function OrdersKpiGrid({
  kpis,
  canSeeFinances,
  activeTab,
  onSelectTab,
  onOpenFirstPendingProof,
  hasPendingProof = false,
}: OrdersKpiGridProps) {
  return (
    <section
      aria-label="Métricas del día"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <KpiCardShell
        testId="pending-payment"
        label="Pendientes de Pago"
        icon="fa-receipt"
        accent="text-amber-600"
        active={activeTab === 'payment_pending'}
        onClick={() => onSelectTab('payment_pending')}
      >
        <p className="text-2xl font-bold text-slate-900">{kpis.pendingPayment.count}</p>
        <MoneyLine usd={kpis.pendingPayment.usd} ves={kpis.pendingPayment.ves} />
        {hasPendingProof && onOpenFirstPendingProof && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onOpenFirstPendingProof();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
                onOpenFirstPendingProof();
              }
            }}
            data-testid="kpi-open-pending-proof"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-red/30 bg-red-50 px-2 py-1 text-xs font-semibold text-brand-red"
          >
            <i className="fa-solid fa-image" aria-hidden="true" />
            Ver comprobante
          </span>
        )}
      </KpiCardShell>

      <KpiCardShell
        testId="kitchen"
        label="En Cocina"
        icon="fa-fire-burner"
        accent="text-blue-600"
        active={activeTab === 'kitchen'}
        onClick={() => onSelectTab('kitchen')}
      >
        <p className="text-2xl font-bold text-slate-900">{kpis.kitchen.total}</p>
        <p className="truncate text-xs font-medium text-slate-500">
          {kpis.kitchen.inProgress} en marcha · {kpis.kitchen.queued} en cola
        </p>
      </KpiCardShell>

      <KpiCardShell
        testId="dispatch"
        label="Listos / Reparto"
        icon="fa-truck-fast"
        accent="text-emerald-600"
        active={activeTab === 'dispatch'}
        onClick={() => onSelectTab('dispatch')}
      >
        <p className="text-2xl font-bold text-slate-900">{kpis.dispatch.total}</p>
        <p className="truncate text-xs font-medium text-slate-500">
          {kpis.dispatch.ready} listos · {kpis.dispatch.onTheWay} en camino
        </p>
      </KpiCardShell>

      {canSeeFinances && (
        <KpiCardShell
          testId="today-sales"
          label="Ventas de Hoy"
          icon="fa-arrow-trend-up"
          accent="text-brand-red"
          active={false}
          onClick={() => onSelectTab('delivered')}
        >
          <p className="text-2xl font-bold text-slate-900">{formatPrice(kpis.todaySales.usd)}</p>
          <p className="truncate text-xs font-medium text-slate-500">
            {kpis.todaySales.count} pedidos ·{' '}
            {kpis.todaySales.ves > 0 ? formatVes(kpis.todaySales.ves) : 'Tasa BCV pendiente'}
          </p>
        </KpiCardShell>
      )}
    </section>
  );
}
