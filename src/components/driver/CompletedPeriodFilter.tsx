import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatCompletedPeriodLabel,
  type CompletedPeriod,
} from '../../utils/completedDeliveries';

interface CompletedPeriodFilterProps {
  period: CompletedPeriod;
  offset: number;
  onPeriodChange: (period: CompletedPeriod) => void;
  onOffsetChange: (offset: number) => void;
}

const PERIOD_OPTIONS: { key: CompletedPeriod; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

export function CompletedPeriodFilter({
  period,
  offset,
  onPeriodChange,
  onOffsetChange,
}: CompletedPeriodFilterProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      data-testid="completed-period-filter"
    >
      <div
        className="flex rounded-xl border border-gray-200 bg-gray-100 p-1"
        role="group"
        aria-label="Filtrar completadas por período"
      >
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={period === option.key}
            onClick={() => onPeriodChange(option.key)}
            data-testid={`completed-period-${option.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              period === option.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {period !== 'today' && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Período anterior"
            onClick={() => onOffsetChange(offset + 1)}
            data-testid="completed-period-prev"
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span
            className="min-w-[9rem] text-center text-sm font-medium text-gray-600"
            data-testid="completed-period-label"
          >
            {formatCompletedPeriodLabel(period, offset, new Date())}
          </span>
          <button
            type="button"
            aria-label="Período siguiente"
            onClick={() => onOffsetChange(Math.max(0, offset - 1))}
            disabled={offset === 0}
            data-testid="completed-period-next"
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default CompletedPeriodFilter;
