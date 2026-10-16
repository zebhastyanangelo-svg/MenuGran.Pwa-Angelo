import type { OrderBoardKpis, OrderBoardTabKey } from '../../utils/orderBoard';
import { formatVes } from '../../utils/orderBoard';
import { formatPrice } from '../../types/cart';

/**
 * Tarjetas de resumen de la cabecera del Tablero de Pedidos en Vivo.
 *
 * Las tres primeras son operativas y las ve todo el personal del comercio; la
 * de ventas del día es la única que resume dinero del negocio y se oculta para
 * el empleado sin acceso a finanzas.
 *
 * El grid es de dos columnas desde el móvil para que las cuatro tarjetas quepan
 * en pantalla sin desplazamiento: el cajero las usa como filtro mientras
 * atiende, así que la cabecera debe caber sin scroll.
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

/** Cifra principal de la tarjeta: escala suave para no desbordar en móvil. */
const KPI_VALUE_CLASS = 'truncate text-xl font-bold leading-tight text-slate-900 sm:text-2xl';
/** Detalle secundario bajo la cifra. */
const KPI_HINT_CLASS = 'mt-0.5 truncate text-[11px] font-medium text-slate-500 sm:text-xs';

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
      className={`min-w-0 rounded-xl border bg-white p-2.5 text-left shadow-sm transition-colors sm:p-3 ${
        active ? 'border-brand-red ring-1 ring-brand-red' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`shrink-0 ${accent}`} aria-hidden="true">
          <i className={`fa-solid ${icon} text-sm`} />
        </span>
        <p className="min-w-0 truncate text-[11px] font-medium text-slate-500 sm:text-xs">
          {label}
        </p>
      </div>
      <div className="mt-1">{children}</div>
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
      <p className={KPI_VALUE_CLASS}>{formatPrice(usd)}</p>
      {ves > 0 && (
        <p className="truncate text-[11px] font-medium leading-tight text-emerald-700 sm:text-xs">
          {formatVes(ves)}
        </p>
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
      className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
    >
      <KpiCardShell
        testId="pending-payment"
        label="Pendientes de Pago"
        icon="fa-receipt"
        accent="text-amber-600"
        active={activeTab === 'payment_pending'}
        onClick={() => onSelectTab('payment_pending')}
      >
        <p className={KPI_VALUE_CLASS}>{kpis.pendingPayment.count}</p>
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
            className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-lg border border-brand-red/30 bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold leading-tight text-brand-red sm:px-2 sm:py-1 sm:text-xs"
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
        <p className={KPI_VALUE_CLASS}>{kpis.kitchen.total}</p>
        <p className={KPI_HINT_CLASS}>
          {kpis.kitchen.inProgress} en marcha · {kpis.kitchen.queued} en cola
        </p>
      </KpiCardShell>

      <KpiCardShell
        testId="dispatch"
        label="Listos / Entregados"
        icon="fa-truck-fast"
        accent="text-emerald-600"
        active={activeTab === 'dispatch'}
        onClick={() => onSelectTab('dispatch')}
      >
        <p className={KPI_VALUE_CLASS}>{kpis.dispatch.total}</p>
        <p className={KPI_HINT_CLASS}>
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
          <p className={KPI_VALUE_CLASS}>{formatPrice(kpis.todaySales.usd)}</p>
          <p className={KPI_HINT_CLASS}>
            {kpis.todaySales.count} pedidos ·{' '}
            {kpis.todaySales.ves > 0 ? formatVes(kpis.todaySales.ves) : 'Tasa BCV pendiente'}
          </p>
        </KpiCardShell>
      )}
    </section>
  );
}
