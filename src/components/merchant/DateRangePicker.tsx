import { type ChangeEvent } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function getDefaultEndDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateForDisplay(value: string): string {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  const [, month, day] = parts;
  return `${day}/${month}`;
}

export function getDefaultDateRange(): { startDate: string; endDate: string } {
  return {
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
  };
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  isLoading,
}: DateRangePickerProps) {
  const handleStartChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value, endDate);
  };

  const handleEndChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(startDate, event.target.value);
  };

  const handleClear = () => {
    const range = getDefaultDateRange();
    onChange(range.startDate, range.endDate);
  };

  const isDisabled = isLoading ?? false;

  return (
    <div className="flex flex-col gap-3 sm:items-end sm:flex-row">
      <div className="flex items-end gap-2">
        <div>
          <label
            htmlFor="date-start"
            className="block text-xs font-medium text-gray-600"
          >
            Desde
          </label>
          <input
            id="date-start"
            type="date"
            value={startDate}
            onChange={handleStartChange}
            disabled={isDisabled}
            max={endDate || undefined}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-red focus:ring-brand-red focus:outline-none disabled:opacity-60"
            aria-label="Fecha de inicio"
          />
        </div>
        <div>
          <label
            htmlFor="date-end"
            className="block text-xs font-medium text-gray-600"
          >
            Hasta
          </label>
          <input
            id="date-end"
            type="date"
            value={endDate}
            onChange={handleEndChange}
            disabled={isDisabled}
            min={startDate || undefined}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-red focus:ring-brand-red focus:outline-none disabled:opacity-60"
            aria-label="Fecha de fin"
          />
        </div>
        <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-xs text-gray-500"
          aria-label="Rango de fechas seleccionado"
        >
          {startDate && endDate
            ? `${formatDateForDisplay(startDate)} – ${formatDateForDisplay(endDate)}`
            : 'Selecciona un rango'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isDisabled}
          aria-label="Restablecer rango de fechas"
          leftIcon={<X className="h-4 w-4" />}
        >
          Restablecer
        </Button>
      </div>
    </div>
  );
}

export default DateRangePicker;
