/**
 * Estado de apertura de un comercio, combinando la agenda semanal con los
 * interruptores manuales del panel.
 *
 * Es la única fuente de verdad para la insignia "Abierto"/"Cerrado": antes de
 * existir la agenda semanal cada vista calculaba el estado por su cuenta y
 *MerchantCard llegaba a mostrar "Cerrado" en comercios con `is_open = true`.
 */

import type { MerchantRow } from '../types/database';
import { isMerchantOpenNow } from './dateUtils';
import {
  describeDaySchedule,
  getScheduleForDate,
  isOpenAtMinutes,
  parseWeeklyHours,
} from './weeklyHours';

export interface MerchantAvailability {
  isOpen: boolean;
  /** Rango del día actual ("08:00 – 20:00") o "Cerrado". */
  todayLabel: string;
  /** Texto de la insignia. */
  badgeLabel: string;
}

function currentMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * `true` si el comercio puede recibir pedidos ahora mismo.
 *
 * Precedencia: los interruptores manuales (`is_active` / `is_open`) ganan
 * sobre el horario, porque el comercio puede cerrar fuera de su agenda
 * (stock agotado, feriado). La agenda semanal define el resto.
 */
export function isMerchantOpen(merchant: MerchantRow, date: Date = new Date()): boolean {
  if (!merchant.is_active || !merchant.is_open) return false;

  if (merchant.weekly_hours != null) {
    const schedule = getScheduleForDate(parseWeeklyHours(merchant.weekly_hours), date);
    return isOpenAtMinutes(schedule, currentMinutes(date));
  }

  return isMerchantOpenNow(merchant.opening_time, merchant.closing_time, date);
}

export function getMerchantAvailability(
  merchant: MerchantRow,
  date: Date = new Date(),
): MerchantAvailability {
  const isOpen = isMerchantOpen(merchant, date);

  const todayLabel =
    merchant.weekly_hours != null
      ? describeDaySchedule(getScheduleForDate(parseWeeklyHours(merchant.weekly_hours), date))
      : merchant.opening_time && merchant.closing_time
        ? `${merchant.opening_time} – ${merchant.closing_time}`
        : 'Horario no configurado';

  return { isOpen, todayLabel, badgeLabel: isOpen ? 'Abierto' : 'Cerrado' };
}