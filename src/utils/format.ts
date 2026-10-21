const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

export function formatCurrency(value: number | string): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return currencyFormatter.format(numeric);
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Formatea un precio en dólares.
 *
 * `formatCurrency` usa el peso mexicano porque así se han calculado los
 * reportes administrativos; los precios de producto se guardan en USD y deben
 * declararse como tales.
 */
export function formatUSD(value: number | string): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return usdFormatter.format(numeric);
}

const venezuelanAmountFormatter = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea un monto en bolívares con un único indicador de moneda.
 *
 * `Intl` con `style: 'currency'` para VES emite el símbolo `Bs.S`. Quitar el
 * código con `replace('VES', '')` no surte efecto (la salida no contiene ese
 * texto) y, al anteponer `Bs.` a mano, el resultado era `Bs. Bs.S 1.234,56`.
 * Aquí se aplica el separador de miles venezolano y `Bs.` se escribe una
 * sola vez.
 */
export function formatVES(value: number | string): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return `Bs. ${venezuelanAmountFormatter.format(numeric)}`;
}

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

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

/**
 * Convierte una hora de 24 horas ("HH:mm" o "HH:mm:ss") al formato legible de
 * 12 horas con indicador AM/PM: "08:00" -> "8:00 AM", "20:00" -> "8:00 PM",
 * "00:30" -> "12:30 AM", "12:00" -> "12:00 PM".
 *
 * Es el único formateador de horas del proyecto: la tarjeta del marketplace y
 * el perfil del comercio lo usan para mostrar exactamente el mismo texto y
 * evitar desajustes por formato militar.
 */
function formatHourMinute(hours: number, minutes: number): string {
  const period = hours < 12 ? 'AM' : 'PM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatTime(value?: string | Date | null): string {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ''
      : formatHourMinute(value.getHours(), value.getMinutes());
  }
  const parsed = parseTimeString(value);
  if (!parsed) return value; // fallback to original string
  return formatHourMinute(parsed.getHours(), parsed.getMinutes());
}

/**
 * Formatea un rango de horario ("08:00" - "20:00") como "8:00 AM - 8:00 PM".
 * Devuelve cadena vacía si falta alguno de los dos extremos.
 */
export function formatTimeRange(opening: string | null | undefined, closing: string | null | undefined): string {
  if (!opening || !closing) return '';
  return `${formatTime(opening)} - ${formatTime(closing)}`;
}
