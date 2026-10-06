/**
 * Modo de servicio elegido por el cliente en la pantalla de bienvenida.
 *
 * Es la primera decisión de la sesión y gobierna el resto del flujo:
 * "Estoy en el negocio" abre el escaneo del QR de mesa, mientras que
 * "Deseo delivery" lleva al marketplace y fija el checkout en entrega a
 * domicilio sin volver a preguntar por el tipo de despacho.
 *
 * Persistencia local siguiendo el mismo patrón que `onboardingStorage`:
 * módulo separado del componente (no rompe el fast-refresh de React), claves
 * propias con prefijo `menugram_`, y errores de almacenamiento ignorados en
 * silencio (modo privado, cuota agotada, SSR).
 *
 * Dos niveles de almacenamiento con intenciones distintas:
 * - `localStorage` guarda el modo elegido, para no romper el checkout ni el
 *   perfil entre sesiones.
 * - `sessionStorage` marca que el cliente ya respondió en la pestaña actual,
 *   para que el selector no reaparezca al salir y volver a la PWA.
 */

import type { OrderType } from '../types/database';

export type ServiceMode = 'in_store' | 'delivery';

export const SERVICE_MODE_KEY = 'menugram_service_mode';

/**
 * Clave de `sessionStorage` que marca que el cliente ya eligió modalidad en
 * esta sesión de la pestaña.
 *
 * Se separa de `SERVICE_MODE_KEY` a propósito: el modo vive en `localStorage`
 * (sobrevive al cierre de la app), mientras que la *pregunta* solo debe
 * desaparecer mientras la pestaña siga abierta.
 */
export const SERVICE_MODE_SESSION_KEY = 'menugram_service_mode_session';

/**
 * Resolución de la elección en la sesión actual.
 *
 * `localStorage` guarda el modo entre sesiones para no romper el checkout ni
 * el perfil, pero NO puede usarse para saber si el cliente ya pasó por el
 * selector en *esta* sesión: al reabrir la PWA el valor viejo sigue ahí y el
 * marketplace se renderizaría antes de la elección.
 *
 * Por eso la bandera vive en `sessionStorage`, que sobrevive a que el usuario
 * salga temporalmente de la PWA (ir a la galería, consultar un comprobante de
 * pago móvil) sin que la PWA se descargue del todo, pero se limpia al cerrar
 * la pestaña o el navegador: exactamente la cadencia que pidió el cliente
 * para que el modal no reaparezca a los pocos segundos.
 *
 * La variable del módulo es solo un espejo en memoria: mantiene el
 * `useSyncExternalStore` estable y sirve de respaldo cuando `sessionStorage`
 * no está disponible o falla (modo privado, SSR, pruebas sin DOM).
 */
let sessionResolved = false;
let sessionResolvedLoaded = false;

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

/**
 * Restaura la bandera de resolución desde `sessionStorage` la primera vez que
 * se consulta, para que recargar o restaurar la PWA no vuelva a mostrar el
 * selector mientras la pestaña siga viva.
 */
function loadSessionResolvedFromStorage(): boolean {
  if (sessionResolvedLoaded) return sessionResolved;
  sessionResolvedLoaded = true;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionResolved = sessionStorage.getItem(SERVICE_MODE_SESSION_KEY) === 'true';
    }
  } catch {
    // Sin sessionStorage disponible se mantiene el valor en memoria.
  }
  return sessionResolved;
}

/** `true` si el cliente ya eligió modalidad en esta sesión de la app. */
export function isServiceModeSessionResolved(): boolean {
  return loadSessionResolvedFromStorage();
}

/** Guarda (o borra) la bandera de resolución en `sessionStorage`. */
function persistSessionResolved(resolved: boolean): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (resolved) {
      sessionStorage.setItem(SERVICE_MODE_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(SERVICE_MODE_SESSION_KEY);
    }
  } catch {
    // Ignorar errores de sessionStorage (modo privado, cuota, etc.)
  }
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
  sessionResolvedLoaded = true;
  persistSessionResolved(true);
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
  sessionResolvedLoaded = true;
  persistSessionResolved(false);
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