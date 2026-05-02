export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

/**
 * Returns true if coordinates are within a certain radius
 */
export function isWithinRadius(
  coord1: Coordinates,
  coord2: Coordinates,
  radiusKm: number
): boolean {
  return calculateDistance(coord1, coord2) <= radiusKm;
}

/**
 * Estimates delivery time based on distance and average speed
 */
export function estimateDeliveryTime(
  distanceKm: number,
  avgSpeedKmH: number = 30
): number {
  // Returns time in minutes
  return Math.ceil((distanceKm / avgSpeedKmH) * 60);
}

/**
 * Formats coordinates for display
 */
export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}


