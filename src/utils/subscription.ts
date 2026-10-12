/**
 * Utilidades de suscripción manual de comercios.
 *
 * El SuperAdmin asigna plazos (7/15/30/90 días) que se almacenan como fecha
 * de expiración (`merchants.subscription_expires_at`). El control es puramente
 * visual y administrativo: nada bloquea el comercio al expirar.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Días restantes hasta la fecha de expiración (YYYY-MM-DD o ISO).
 *
 * Redondea hacia arriba (mañana cuenta como 1 día). Devuelve 0 si la fecha ya
 * pasó o no es válida; `null` si no hay fecha configurada.
 */
export function calculateSubscriptionDaysLeft(
  expirationDate: string | null | undefined,
): number | null {
  if (expirationDate === null || expirationDate === undefined || expirationDate.trim() === '') {
    return null;
  }
  const expirationTime = new Date(expirationDate).getTime();
  if (Number.isNaN(expirationTime)) return null;

  // Se compara contra el inicio del día local para que "hoy" no descuento
  // horas parciales y el contador sea estable durante toda la jornada.
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.ceil((expirationTime - todayStart.getTime()) / DAY_MS);
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Fecha de expiración (YYYY-MM-DD, hora local) resultante de sumar `days`
 * días desde hoy. Devuelve `null` si `days` no es un entero positivo.
 */
export function buildExpirationDateFromDays(days: number): string | null {
  if (!Number.isInteger(days) || days <= 0) return null;
  const target = new Date();
  target.setDate(target.getDate() + days);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
