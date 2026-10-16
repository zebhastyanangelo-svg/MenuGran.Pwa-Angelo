import type { PaymentMethod } from '../../types/database';
import {
  ORDER_BOARD_PERIODS,
  ORDER_BOARD_TABS,
  type OrderBoardPeriod,
  type OrderBoardTabKey,
} from '../../utils/orderBoard';
import { getPaymentMethodLabel } from '../../utils/paymentMethod';

/**
 * Barra de filtros del tablero: pestañas de estado con contadores, período,
 * método de pago y búsqueda inteligente por código de orden o por cliente.
 */

export interface OrdersFilterBarProps {
  counts: Record<OrderBoardTabKey, number>;
  activeTab: OrderBoardTabKey;
  onTabChange: (tab: OrderBoardTabKey) => void;
  period: OrderBoardPeriod;
  onPeriodChange: (period: OrderBoardPeriod) => void;
  paymentMethod: PaymentMethod | 'all';
  onPaymentMethodChange: (method: PaymentMethod | 'all') => void;
  availablePaymentMethods: readonly PaymentMethod[];
  query: string;
  onQueryChange: (query: string) => void;
  resultCount: number;
}

function StatusTabs({ counts, activeTab, onTabChange }: {
  counts: Record<OrderBoardTabKey, number>;
  activeTab: OrderBoardTabKey;
  onTabChange: (tab: OrderBoardTabKey) => void;
}) {
  return (
    <nav
      aria-label="Filtrar pedidos por estado"
      className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
    >
      {ORDER_BOARD_TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            aria-pressed={isActive}
            data-testid={`tab-${tab.key}`}
            className={`flex min-w-[7.5rem] shrink-0 snap-start items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-red text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-500">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
      >
        {children}
      </select>
    </div>
  );
}

export function OrdersFilterBar({
  counts,
  activeTab,
  onTabChange,
  period,
  onPeriodChange,
  paymentMethod,
  onPaymentMethodChange,
  availablePaymentMethods,
  query,
  onQueryChange,
  resultCount,
}: OrdersFilterBarProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <StatusTabs counts={counts} activeTab={activeTab} onTabChange={onTabChange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          id="board-period"
          label="Fecha"
          value={period}
          onChange={(value) => onPeriodChange(value as OrderBoardPeriod)}
        >
          {ORDER_BOARD_PERIODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="board-payment-method"
          label="Método de pago"
          value={paymentMethod}
          onChange={(value) => onPaymentMethodChange(value as PaymentMethod | 'all')}
        >
          <option value="all">Todos</option>
          {availablePaymentMethods.map((method) => (
            <option key={method} value={method}>
              {getPaymentMethodLabel(method)}
            </option>
          ))}
        </SelectField>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="board-search" className="text-xs font-medium text-slate-500">
            Buscar pedido o cliente
          </label>
          <div className="relative">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              aria-hidden="true"
            />
            <input
              id="board-search"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="#845F, nombre o cédula"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500" role="status" data-testid="board-result-count">
        {resultCount === 1 ? '1 pedido' : `${resultCount} pedidos`}
      </p>
    </div>
  );
}
