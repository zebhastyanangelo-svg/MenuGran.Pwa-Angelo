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

export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(`1970-01-01T${value}:00`) : value;
  return timeFormatter.format(date);
}

export function formatTimeRange(opening: string | null | undefined, closing: string | null | undefined): string {
  if (!opening || !closing) return '';
  return `${formatTime(opening)} - ${formatTime(closing)}`;
}
