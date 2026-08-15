import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useToast } from '../../hooks/useToast';
import type { GeoPoint } from '../../types/database';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 13;
const USER_LOCATION_ZOOM = 16;

const PIN_ICON = L.icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#10b981">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 12 7 12s7-6.75 7-12c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 7 12 7s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export interface LocationPickerProps {
  initialLocation?: GeoPoint | null;
  onLocationChange: (location: GeoPoint | null) => void;
  userLocation?: [number, number] | null;
  className?: string;
}

function createMap(
  container: HTMLElement,
  center: [number, number],
  zoom: number,
): L.Map {
  const map = L.map(container, {
    center,
    zoom,
    zoomControl: true,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  return map;
}

function syncMarker(
  latlng: L.LatLngExpression,
  map: L.Map,
  markerRef: React.MutableRefObject<L.Marker | null>,
): void {
  if (markerRef.current === null) {
    markerRef.current = L.marker(latlng, { icon: PIN_ICON });
    markerRef.current.addTo(map);
  } else {
    markerRef.current.setLatLng(latlng);
  }
}

const GEO_OPTIONS: PositionOptions = {
  timeout: 10000,
  enableHighAccuracy: true,
  maximumAge: 0,
};

function geolocatePosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      GEO_OPTIONS,
    );
  });
}

const GEO_ERROR_MESSAGES: Record<number, string> = {
  1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
  2: 'No se obtuvo la ubicación del dispositivo.',
  3: 'El tiempo de obtención de ubicación se agotó.',
};

export function LocationPicker({
  initialLocation = null,
  onLocationChange,
  userLocation = null,
  className = 'h-64 w-full',
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (mapRef.current === null || L === undefined) return;

    const initialCenter: [number, number] =
      initialLocation !== null
        ? [initialLocation.y, initialLocation.x]
        : userLocation !== null
          ? userLocation
          : DEFAULT_CENTER;

    if (mapInstanceRef.current === null) {
      const map = createMap(mapRef.current, initialCenter, DEFAULT_ZOOM);
      mapInstanceRef.current = map;
      map.invalidateSize();

      map.on('click', (e: L.LeafletMouseEvent) => {
        const latlng = e.latlng;
        const point: GeoPoint = { x: latlng.lng, y: latlng.lat };
        onLocationChange(point);
      });
    }

    const map = mapInstanceRef.current;
    if (map === null) return;

    if (initialLocation !== null) {
      syncMarker([initialLocation.y, initialLocation.x], map, markerRef);
    }

    return () => {
      if (markerRef.current !== null) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [initialLocation, onLocationChange, userLocation]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current !== null) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const pos = await geolocatePosition();
      const { latitude, longitude } = pos.coords;
      const point: GeoPoint = { x: longitude, y: latitude };
      onLocationChange(point);
      const map = mapInstanceRef.current;
      if (map !== null) {
        map.flyTo([latitude, longitude], USER_LOCATION_ZOOM);
      }
      syncMarker([latitude, longitude], map!, markerRef);
      showToast({
        title: 'Ubicación actualizada',
        message: 'Se centró el mapa en tu ubicación.',
        variant: 'success',
      });
      } catch (err) {
      const code =
        err !== null && typeof err === 'object' && 'code' in err
          ? (err as { code: number }).code
          : undefined;
      const message =
        code !== undefined && code in GEO_ERROR_MESSAGES
          ? GEO_ERROR_MESSAGES[code]
          : 'No se pudo obtener tu ubicación.';
      showToast({
        title: 'Error de geolocalización',
        message,
        variant: 'error',
      });
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="relative">
      <div ref={mapRef} className={className} />
      <button
        type="button"
        onClick={handleDetectLocation}
        disabled={isLocating}
        className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-md hover:bg-gray-50 disabled:opacity-50"
      >
        {isLocating ? (
          <>
            <svg
              className="-ml-0.5 h-3 w-3 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Obteniendo ubicación"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M8 8a4 4 0 018 0v4a4 4 0 11-8 0V8z"
              />
            </svg>
            <span>Obteniendo ubicación...</span>
          </>
        ) : (
          <span>Usar mi ubicación</span>
        )}
      </button>
    </div>
  );
}
