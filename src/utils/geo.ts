/**
 * Utilidades de distancia geográfica.
 * Fórmula de Haversine para calcular la distancia entre dos puntos
 * sobre la superficie de la Tierra (radio ≈ 6 371 km).
 */
import type { GeoPoint } from '../types/database';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula la distancia en kilómetros entre dos coordenadas GPS
 * usando la fórmula de Haversine.
 *
 * @param a - Primer punto (x = longitud, y = latitud)
 * @param b - Segundo punto (x = longitud, y = latitud)
 * @returns Distancia en kilómetros
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.y - a.y);
  const dLng = toRadians(b.x - a.x);

  const lat1 = toRadians(a.y);
  const lat2 = toRadians(b.y);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Radio de filtrado por defecto en kilómetros. */
export const DEFAULT_NEARBY_RADIUS_KM = 1;
