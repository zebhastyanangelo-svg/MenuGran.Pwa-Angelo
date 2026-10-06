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

/**
 * Resolución de la elección en la sesión actual (memoria del módulo).
 *
 * `localStorage` guarda el modo entre sesiones para no romper el checkout ni
 * el perfil, pero NO puede usarse para saber si el cliente ya pasó por el
 * selector en *esta* sesión: al reabrir la PWA el valor viejo sigue ahí y el
 * marketplace se renderizaría antes de la elección. Esta bandera vive solo en
 * memoria: arranca en `false` en cada carga de la app (exactamente la
 * cadencia con la que `ServiceModeGate` vuelve a preguntar) y se enciende al
 * elegir. Los interesados (gate, marketplace) se suscriben a los cambios.
 */
let sessionResolved = false;

type ServiceModeListener = () => void;
const listeners = new Set<ServiceModeListener>();

/** Suscripción a cambios del modo/resolución. Deviene la función de baja. */
export function subscribeToServiceMode(listener: ServiceModeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyServiceModeListeners(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/** `true` si el cliente ya eligió modalidad en esta sesión de la app. */
export function isServiceModeSessionResolved(): boolean {
  return sessionResolved;
}

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

/**
 * Guarda el modo de servicio elegido y marca la sesión como resuelta.
 *
 * Es la única vía de resolver la sesión: la llama `ServiceModeGate` tras la
 * elección del cliente, así que cualquier superficie (marketplace incluida)
 * puede esperar a `isServiceModeSessionResolved()` sin acoplarse al gate.
 */
export function saveServiceMode(mode: ServiceMode): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SERVICE_MODE_KEY, mode);
    }
  } catch {
    // Ignorar errores de localStorage (modo privado, cuota, etc.)
  }
  sessionResolved = true;
  notifyServiceModeListeners();
}

/**
 * Olvida el modo de servicio y vuelve a marcar la sesión sin resolver, para
 * que la próxima entrada vuelva a preguntar (p. ej. "cambiar modalidad"
 * desde el perfil).
 */
export function clearServiceMode(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SERVICE_MODE_KEY);
    }
  } catch {
    // Ignorar errores de localStorage (modo privado, cuota, etc.)
  }
  sessionResolved = false;
  notifyServiceModeListeners();
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