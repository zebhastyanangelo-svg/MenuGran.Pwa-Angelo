/**
 * Recordatorios de menú programados en el cliente ("Es hora de comer").
 *
 * Es el refuerzo local del Periodic Sync del service worker: mientras la app
 * está abierta, un temporizador revisa cada 15 minutos si la hora actual cae
 * en una franja de comida (desayuno / almuerzo / cena) y muestra la
 * notificación una sola vez por franja y por día.
 *
 * La persistencia usa `localStorage` (clave por día) para no repetir el aviso
 * tras recargar la pestaña. Si el almacenamiento está bloqueado, el
 * recordatorio simplemente puede repetirse dentro de la franja: nunca lanza.
 */

export interface MenuReminderCopy {
  title: string;
  body: string;
}

/** Horas de inicio de cada franja de comida (hora local del dispositivo). */
export const MENU_REMINDER_SLOTS: readonly number[] = [9, 12, 19];

/** Cada cuánto revisa el temporizador si toca lanzar un recordatorio. */
export const MENU_REMINDER_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/** Clave de `localStorage` con las franjas ya mostradas, por día. */
export const MENU_REMINDER_STORAGE_KEY = 'menugran-menu-reminders-shown';

/** Días de historial que se conservan en `localStorage` antes de podar. */
const MAX_STORED_DAYS = 3;

/**
 * Copy del recordatorio según la franja horaria. Espejo del
 * `buildReminderCopy` del service worker para que el usuario vea el mismo
 * mensaje llegue por Periodic Sync o por el temporizador local.
 */
export function buildMenuReminderCopy(hour: number): MenuReminderCopy {
  if (hour >= 5 && hour < 11) {
    return {
      title: '☕ Buenos días',
      body: '¿Qué se te antoja desayunar? Hay comercios abiertos cerca de ti.',
    };
  }
  if (hour >= 11 && hour < 15) {
    return {
      title: '🍽️ Hora de almorzar',
      body: 'Mira los menús disponibles cerca de ti y pide antes de que se llene.',
    };
  }
  if (hour >= 15 && hour < 21) {
    return {
      title: '🌙 Hora de cenar',
      body: 'Termina el día con tu plato favorito, a la puerta de tu casa.',
    };
  }
  return {
    title: '🍽️ ¿Qué se te antoja?',
    body: 'Descubre los menús de MenuGran disponibles cerca de ti.',
  };
}

/**
 * Slot de recordatorio vigente para la hora dada, o `null` si es madrugada
 * (0-8 h) o noche avanzada (21-23 h): no se molesta al usuario entonces.
 */
export function resolveMenuReminderSlot(hour: number): number | null {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (hour >= 21 || hour < 5) return null;
  const candidates = [...MENU_REMINDER_SLOTS].reverse();
  for (const slot of candidates) {
    if (hour >= slot) return slot;
  }
  return null;
}

/** Clave de día local (YYYY-MM-DD) usada en el registro de franjas mostradas. */
export function buildMenuReminderDateKey(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Registro persistido: fecha local (YYYY-MM-DD) → franjas ya mostradas. */
type ShownReminderLog = Record<string, number[]>;

function isShownReminderLog(value: unknown): value is ShownReminderLog {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every(
    (slots) => Array.isArray(slots) && slots.every((slot) => typeof slot === 'number'),
  );
}

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage !== undefined;
  } catch {
    return false;
  }
}

/** Lee las franjas ya mostradas. Nunca lanza: fallo = registro vacío. */
export function readShownMenuReminders(): ShownReminderLog {
  if (!storageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(MENU_REMINDER_STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    return isShownReminderLog(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Guarda una franja como mostrada para el día dado (podando historial viejo). */
export function markMenuReminderShown(dateKey: string, slot: number): void {
  if (!storageAvailable()) return;
  try {
    const log = readShownMenuReminders();
    const slots = log[dateKey] ?? [];
    if (!slots.includes(slot)) slots.push(slot);
    const pruned = Object.entries({ ...log, [dateKey]: slots })
      .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
      .slice(0, MAX_STORED_DAYS);
    window.localStorage.setItem(MENU_REMINDER_STORAGE_KEY, JSON.stringify(Object.fromEntries(pruned)));
  } catch {
    // Almacenamiento bloqueado: el aviso puede repetirse, no es fatal.
  }
}

/** Recordatorio pendiente de mostrar en este instante. */
export interface PendingMenuReminder {
  slot: number;
  copy: MenuReminderCopy;
}

/**
 * Decide si toca lanzar un recordatorio ahora: hay franja activa, permiso
 * concedido y la franja de hoy todavía no se mostró.
 */
export function getPendingMenuReminder(now: Date): PendingMenuReminder | null {
  const slot = resolveMenuReminderSlot(now.getHours());
  if (slot === null) return null;

  const dateKey = buildMenuReminderDateKey(now);
  const shown = readShownMenuReminders()[dateKey] ?? [];
  if (shown.includes(slot)) return null;

  return { slot, copy: buildMenuReminderCopy(now.getHours()) };
}

/**
 * Muestra el recordatorio vía Service Worker con fallback al constructor.
 * Devuelve `false` si el navegador no soporta notificaciones o falta permiso.
 */
export async function showMenuReminderNotification(reminder: PendingMenuReminder): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(reminder.copy.title, {
        body: reminder.copy.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'menugram-menu-reminder',
        data: { url: '/marketplace' },
      });
      return true;
    }
  } catch (error) {
    console.warn('[menu-reminders] Service Worker no disponible, usando fallback:', error);
  }

  try {
    new Notification(reminder.copy.title, {
      body: reminder.copy.body,
      tag: 'menugram-menu-reminder',
    });
    return true;
  } catch (error) {
    console.error('[menu-reminders] No se pudo mostrar el recordatorio:', error);
    return false;
  }
}
