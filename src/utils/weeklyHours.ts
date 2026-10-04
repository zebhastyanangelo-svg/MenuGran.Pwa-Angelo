/**
 * Horario de atención semanal de los comercios.
 *
 * Toda la lógica de lectura, validación y consulta de la agenda vive aquí para
 * que sea pura y verificable sin Supabase ni React. La UI sólo edita y el
 * marketplace sólo consulta `isMerchantOpenOnDate`.
 */

import type { DaySchedule, WeekdayKey, WeeklyHours, WeeklySchedule } from '../types/database';

/** Días en el orden en que se muestran al usuario (lunes primero). */
export const WEEKDAY_KEYS: readonly WeekdayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

/** Rango aplicado a los días que el comercio no define explícitamente. */
export const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  is_open: true,
  open_time: '08:00',
  close_time: '20:00',
};

export const DEFAULT_TIMEZONE = 'America/Caracas';

/**
 * Acepta "HH:mm" y "HH:mm:ss".
 *
 * El segundo caso es real: las columnas legacy `merchants.opening_time` /
 * `closing_time` son de tipo `time` en Supabase y PostgREST las devuelve como
 * "09:00:00". Rechazarlas descarta el horario real del comercio y lo sustituye
 * por el default, así que se admiten y luego se normalizan a "HH:mm".
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** `true` si la cadena es una hora válida en formato "HH:mm" (o "HH:mm:ss"). */
export function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

/**
 * Normaliza una hora a "HH:mm", descartando los segundos.
 * Devuelve `null` si el valor no es una hora válida.
 */
export function normalizeTimeString(value: unknown): string | null {
  if (!isValidTimeString(value)) return null;
  return value.slice(0, 5);
}

/** Convierte "HH:mm" (o "HH:mm:ss") a minutos desde medianoche. */
export function timeToMinutes(value: string): number | null {
  if (!isValidTimeString(value)) return null;

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function sanitizeTime(value: unknown, fallback: string): string {
  return normalizeTimeString(value) ?? fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Lee el horario de un día desde datos no confiables (JSONB de la BD).
 * Completa los campos ausentes o inválidos con `DEFAULT_DAY_SCHEDULE`.
 */
export function parseDaySchedule(raw: unknown): DaySchedule {
  if (!isRecord(raw)) return { ...DEFAULT_DAY_SCHEDULE };

  const openTime = sanitizeTime(raw.open_time, DEFAULT_DAY_SCHEDULE.open_time);
  const closeTime = sanitizeTime(raw.close_time, DEFAULT_DAY_SCHEDULE.close_time);

  return {
    // Sólo `is_open === false` cierra el día: un campo ausente mantiene abierto.
    is_open: raw.is_open !== false,
    open_time: openTime,
    close_time: closeTime,
  };
}

function parseSchedule(raw: unknown): WeeklySchedule {
  const source = isRecord(raw) ? raw : {};
  const entries = WEEKDAY_KEYS.map(
    (key) => [key, parseDaySchedule(source[key])] as const,
  );
  return Object.fromEntries(entries) as WeeklySchedule;
}

/**
 * Convierte el JSONB `merchants.weekly_hours` en un horario válido.
 *
 * Tolera `null`, objetos vacíos, días sueltos, claves extra y horas mal
 * formadas: nunca lanza, para que un dato corrupto en la BD no rompa la
 * página del comercio.
 */
export function parseWeeklyHours(raw: unknown): WeeklyHours {
  const source = isRecord(raw) ? raw : {};
  const rawTimezone = typeof source.timezone === 'string' ? source.timezone.trim() : '';

  return {
    timezone: rawTimezone !== '' ? rawTimezone : DEFAULT_TIMEZONE,
    schedule: parseSchedule(source.schedule),
  };
}

/** Agenda con todos los días en el rango por defecto. */
export function createDefaultWeeklyHours(timezone: string = DEFAULT_TIMEZONE): WeeklyHours {
  return parseWeeklyHours({ timezone, schedule: {} });
}

/**
 * Valida y normaliza la agenda editada en el formulario.
 * Descarta horas inválidas y cierra los días marcados como cerrados.
 */
export function normalizeWeeklySchedule(raw: unknown): WeeklySchedule {
  return parseSchedule(raw);
}

/** `true` si el comercio abre ese día. */
export function isOpenOnDay(hours: WeeklyHours, day: WeekdayKey): boolean {
  return hours.schedule[day].is_open;
}

/**
 * `true` si, en el día dado, la hora `minutes` cae dentro del horario.
 *
 * Si `close_time` es menor que `open_time` elLocal cruza la medianoche
 * (p. ej. 20:00 → 02:00) y se evalúa como dos tramos.
 */
export function isOpenAtMinutes(
  schedule: DaySchedule,
  minutes: number,
): boolean {
  if (!schedule.is_open) return false;

  const openMinutes = timeToMinutes(schedule.open_time);
  const closeMinutes = timeToMinutes(schedule.close_time);
  if (openMinutes === null || closeMinutes === null) return false;

  // Ventana de longitud cero: el comercio no abre nunca ese día.
  if (openMinutes === closeMinutes) return false;

  if (openMinutes < closeMinutes) {
    return minutes >= openMinutes && minutes < closeMinutes;
  }

  return minutes >= openMinutes || minutes < closeMinutes;
}

/** Minutos transcurridos desde medianoche para una fecha dada. */
function currentMinutesFor(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function weekdayKeyFor(date: Date): WeekdayKey {
  // `getDay()` devuelve 0 para domingo; la semana empieza en lunes.
  return WEEKDAY_KEYS[(date.getDay() + 6) % 7];
}

/** Agenda del día de la semana al que pertenece `date`. */
export function getScheduleForDate(hours: WeeklyHours, date: Date): DaySchedule {
  return hours.schedule[weekdayKeyFor(date)];
}

/** `true` si el comercio está abierto en el instante indicado. */
export function isMerchantOpenOnDate(hours: WeeklyHours, date: Date = new Date()): boolean {
  return isOpenAtMinutes(getScheduleForDate(hours, date), currentMinutesFor(date));
}

/** Resumen "08:00 – 20:00" o "Cerrado" para un día. */
export function describeDaySchedule(schedule: DaySchedule): string {
  if (!schedule.is_open) return 'Cerrado';
  return `${schedule.open_time} – ${schedule.close_time}`;
}

/** Número de días a la semana en los que el comercio abre. */
export function countOpenDays(hours: WeeklyHours): number {
  return WEEKDAY_KEYS.filter((key) => hours.schedule[key].is_open).length;
}

/** `true` si el comercio abre al menos un día. */
export function hasAnyOpenDay(hours: WeeklyHours): boolean {
  return countOpenDays(hours) > 0;
}

/**
 * Resume la agenda semanal en un único rango, para las columnas legacy
 * `merchants.opening_time` / `closing_time` que siguen consumiendo las vistas
 * antiguas. Devuelve `null` si el comercio no abre ningún día.
 */
export function summarizeWeeklyHours(hours: WeeklyHours): {
  opening_time: string | null;
  closing_time: string | null;
} {
  const openDays = WEEKDAY_KEYS.filter((key) => hours.schedule[key].is_open);
  if (openDays.length === 0) {
    return { opening_time: null, closing_time: null };
  }

  const openTimes = openDays.map((key) => timeToMinutes(hours.schedule[key].open_time));
  const closeTimes = openDays.map((key) => timeToMinutes(hours.schedule[key].close_time));
  const validOpens = openTimes.filter((value): value is number => value !== null);
  const validCloses = closeTimes.filter((value): value is number => value !== null);

  if (validOpens.length === 0 || validCloses.length === 0) {
    return { opening_time: null, closing_time: null };
  }

  const toTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  };

  return {
    opening_time: toTimeString(Math.min(...validOpens)),
    closing_time: toTimeString(Math.max(...validCloses)),
  };
}