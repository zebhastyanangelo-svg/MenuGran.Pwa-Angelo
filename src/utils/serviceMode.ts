/**
 * Modo de servicio elegido por el cliente en la pantalla de bienvenida.
 *
 * Es la primera decisión de la sesión y gobierna el resto del flujo:
 * "Estoy en el negocio" abre el escaneo del QR de mesa, mientras que
 * "Deseo delivery" lleva al marketplace y fija el checkout en entrega a
 * domicilio sin volver a preguntar por el tipo de despacho.
 *
 * Persistencia local siguiendo el mismo patrón que `onboardingStorage`:
 * módulo separado del componente (no rompe el fast-refresh de React), clave
 * propia con prefijo `menugram_`, y errores de `localStorage` ignorados en
 * silencio (modo privado, cuota agotada, SSR).
 */

import type { OrderType } from '../types/database';

export type ServiceMode = 'in_store' | 'delivery';

export const SERVICE_MODE_KEY = 'menugram_service_mode';

/** Destino tras elegir "Estoy en el negocio": el lector de códigos QR. */
export const IN_STORE_SCAN_PATH = '/scan';

/** Destino tras elegir "Deseo delivery": el marketplace con radio de 1 km. */
export const DELIVERY_MARKETPLACE_PATH = '/marketplace';

/** Radio de cobertura que el marketplace aplica en el flujo de delivery (km). */
export const DELIVERY_COVERAGE_RADIUS_KM = 1.0;

/** `true` si el valor persistido es un modo de servicio conocido. */
export function isValidServiceMode(value: unknown): value is ServiceMode {
  return value === 'in_store' || value === 'delivery';
}

/**
 * Modo de servicio elegido en esta sesión, o `null` si todavía no se ha
 * elegido (o el valor guardado se corrompió).
 */
export function readServiceMode(): ServiceMode | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(SERVICE_MODE_KEY);
    return isValidServiceMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Guarda el modo de servicio elegido. */
export function saveServiceMode(mode: ServiceMode): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SERVICE_MODE_KEY, mode);
  } catch {
    // Ignorar errores de localStorage (modo privado, cuota, etc.)
  }
}

/** Olvida el modo de servicio, para que la próxima entrada vuelva a preguntar. */
export function clearServiceMode(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(SERVICE_MODE_KEY);
  } catch {
    // Ignorar errores de localStorage (modo privado, cuota, etc.)
  }
}

/** Ruta a la que debe ir el cliente después de elegir modo de servicio. */
export function getPostOnboardingPath(mode: ServiceMode): string {
  return mode === 'in_store' ? IN_STORE_SCAN_PATH : DELIVERY_MARKETPLACE_PATH;
}

/**
 * Tipo de despacho que el checkout debe usar sin volver a preguntar.
 * `null` cuando el cliente todavía no eligió modo.
 */
export function resolveOrderTypeForMode(mode: ServiceMode | null): OrderType | null {
  if (mode === null) return null;
  return mode === 'delivery' ? 'delivery' : 'in_store';
}

/**
 * `true` si el checkout debe ocultar el selector de despacho porque el cliente
 * ya definió su tipo en la pantalla de bienvenida.
 */
export function isOrderTypeLockedByMode(mode: ServiceMode | null): boolean {
  return mode !== null;
}