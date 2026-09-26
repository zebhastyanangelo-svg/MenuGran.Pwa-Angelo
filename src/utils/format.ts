const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

export function formatCurrency(value: number | string): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return currencyFormatter.format(numeric);
}

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function parseTimeString(timeStr: string): Date | null {
  if (!timeStr) return null;
  // Accept HH:mm or HH:mm:ss
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  if (isNaN(date.getTime())) return null;
  return date;
}

export function formatTime(value?: string | Date | null): string {
  if (!value) return '';
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : timeFormatter.format(value);
  }
  const parsed = parseTimeString(value);
  if (!parsed) return value; // fallback to original string
  return timeFormatter.format(parsed);
}

export function formatTimeRange(opening: string | null | undefined, closing: string | null | undefined): string {
  if (!opening || !closing) return '';
  return `${formatTime(opening)} - ${formatTime(closing)}`;
}
