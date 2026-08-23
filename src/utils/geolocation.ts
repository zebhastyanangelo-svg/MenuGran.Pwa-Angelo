/**
 * Utilidades de geolocalización GPS del navegador.
 * Cada función tiene una única responsabilidad y es testeable de forma aislada.
 */
import type { GeoPoint } from '../types/database';

const GEO_OPTIONS: PositionOptions = {
  timeout: 10000,
  enableHighAccuracy: true,
  maximumAge: 0,
};

export const GEOLOCATION_UNSUPPORTED_MESSAGE =
  'Tu dispositivo o navegador no soporta geolocalización. Ingresa la dirección manualmente.';

export const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
  2: 'No se pudo obtener la ubicación del dispositivo. Verifica que el GPS esté activo.',
  3: 'El tiempo para obtener tu ubicación se agotó. Inténtalo de nuevo.',
};

/** Indica si el navegador expone la API de Geolocation. */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && navigator.geolocation !== undefined;
}

/**
 * Traduce un error de geolocalización a un mensaje amigable en español.
 */
export function resolveGeolocationErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message === GEOLOCATION_UNSUPPORTED_MESSAGE
  ) {
    return GEOLOCATION_UNSUPPORTED_MESSAGE;
  }
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'number' && code in GEOLOCATION_ERROR_MESSAGES) {
      return GEOLOCATION_ERROR_MESSAGES[code];
    }
  }
  return 'No se pudo obtener tu ubicación. Inténtalo de nuevo.';
}

/**
 * Solicita al navegador la posición GPS actual y la devuelve como GeoPoint
 * (x=longitud, y=latitud). Rechaza con el error nativo del navegador
 * (con `code`) o con Error cuando la API no está disponible.
 */
export function getCurrentGeoPoint(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error(GEOLOCATION_UNSUPPORTED_MESSAGE));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          reject(new Error('El dispositivo devolvió coordenadas inválidas.'));
          return;
        }
        resolve({ x: longitude, y: latitude });
      },
      (error) => reject(error),
      GEO_OPTIONS,
    );
  });
}
