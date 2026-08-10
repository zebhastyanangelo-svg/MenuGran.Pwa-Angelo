import type { GeoPoint, MerchantRow } from '../types/database';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface DistanceResult {
  km: number;
  m: number;
}

export function haversineDistance(a: GeoPoint, b: GeoPoint): DistanceResult {
  const lat1 = toRadians(a.y);
  const lat2 = toRadians(b.y);
  const deltaLat = toRadians(b.y - a.y);
  const deltaLng = toRadians(b.x - a.x);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const km = EARTH_RADIUS_KM * c;

  return { km, m: km * 1000 };
}

export function sortByDistance<T extends { location: GeoPoint | null }>(
  items: readonly T[],
  from: GeoPoint,
): T[] {
  return [...items].sort((a, b) => {
    const d = a.location ? haversineDistance(a.location, from).km : Infinity;
    const e = b.location ? haversineDistance(b.location, from).km : Infinity;
    return d - e;
  });
}

interface LocatedItem {
  location: GeoPoint | null;
}

export function merchantsByDistance(
  merchants: readonly (MerchantRow & LocatedItem)[],
  from: GeoPoint,
): MerchantRow[] {
  return [...merchants].sort((a, b) => {
    if (a.location === null && b.location === null) return 0;
    if (a.location === null) return 1;
    if (b.location === null) return -1;
    return (
      haversineDistance(a.location, from).km -
      haversineDistance(b.location, from).km
    );
  });
}
