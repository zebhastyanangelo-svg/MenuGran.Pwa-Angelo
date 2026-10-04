import { supabase, TABLE_NAMES } from './supabase';
import { sendNearbyMerchantNotification } from './pushNotificationService';

const DEFAULT_RADIUS_KM = 5;
const GEOFENCING_STORAGE_KEY = 'menugram-geofencing-last-notified';

interface MerchantWithLocation {
  id: string;
  name: string;
  location: { x: number; y: number } | null;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GeofencingResult {
  notified: boolean;
  merchantName?: string;
  distanceKm?: number;
}

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine.
 * Retorna la distancia en kilómetros.
 */
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Obtiene la ubicación actual del usuario usando la API de geolocalización.
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocalización no soportada'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Error de geolocalización: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  });
}

/**
 * Consulta los comercios activos con ubicación desde Supabase.
 */
async function getMerchantsWithLocation(): Promise<MerchantWithLocation[]> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.merchants)
    .select('id, name, location')
    .eq('is_active', true)
    .not('location', 'is', null);

  if (error !== null || data === null) {
    return [];
  }

  return data.map((m: { id: string; name: string; location: string | null }) => {
    let parsedLocation: { x: number; y: number } | null = null;
    if (m.location !== null) {
      try {
        const match = m.location.match(/POINT\(([^)]+)\)/);
        if (match !== null) {
          const [lon, lat] = match[1].split(' ').map(Number);
          parsedLocation = { x: lon, y: lat };
        }
      } catch {
        parsedLocation = null;
      }
    }
    return {
      id: m.id,
      name: m.name,
      location: parsedLocation,
    };
  });
}

/**
 * Verifica si el usuario está dentro del radio de algún comercio cercano
 * y envía una notificación push si es así.
 */
export async function checkAndNotifyNearbyMerchants(
  radiusKm: number = DEFAULT_RADIUS_KM,
): Promise<GeofencingResult> {
  const lastNotified = localStorage.getItem(GEOFENCING_STORAGE_KEY);
  const now = Date.now();
  const cooldownMs = 30 * 60 * 1000;

  if (lastNotified !== null && now - parseInt(lastNotified, 10) < cooldownMs) {
    return { notified: false };
  }

  try {
    const userLocation = await getCurrentPosition();
    const merchants = await getMerchantsWithLocation();

    let closestMerchant: MerchantWithLocation | null = null;
    let closestDistance = Infinity;

    for (const merchant of merchants) {
      if (merchant.location === null) continue;

      const distance = calculateDistanceKm(userLocation, {
        latitude: merchant.location.y,
        longitude: merchant.location.x,
      });

      if (distance <= radiusKm && distance < closestDistance) {
        closestDistance = distance;
        closestMerchant = merchant;
      }
    }

    if (closestMerchant !== null) {
      await sendNearbyMerchantNotification(closestMerchant.name);
      localStorage.setItem(GEOFENCING_STORAGE_KEY, now.toString());
      return {
        notified: true,
        merchantName: closestMerchant.name,
        distanceKm: Math.round(closestDistance * 100) / 100,
      };
    }

    return { notified: false };
  } catch {
    return { notified: false };
  }
}
