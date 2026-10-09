import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Loader2, MapPin } from 'lucide-react';
import type { GeoPoint } from '../../types/database';
import {
  GEOLOCATION_UNSUPPORTED_MESSAGE,
  getCurrentGeoPoint,
  isGeolocationSupported,
  resolveGeolocationErrorMessage,
} from '../../utils/geolocation';
import 'leaflet/dist/leaflet.css';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'es,en;q=0.9',
        },
      }
    );
    if (!response.ok) return '';
    const data = await response.json();
    if (data.display_name) return data.display_name;

    const parts: string[] = [];
    if (data.address?.road) parts.push(data.address.road);
    if (data.address?.suburb) parts.push(data.address.suburb);
    if (data.address?.neighbourhood) parts.push(data.address.neighbourhood);
    if (data.address?.city) parts.push(data.address.city);
    if (data.address?.state) parts.push(data.address.state);
    return parts.join(', ');
  } catch {
    return '';
  }
}

const DEFAULT_ZOOM = 13;
const NEUTRAL_CENTER: [number, number] = [0, 0];
const CAPTURED_ZOOM = 16;

const PIN_ICON = L.icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#e11d48">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 12 7 12s7-6.75 7-12c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 7 12 7s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export interface LocationSettingsFormProps {
  location: GeoPoint | null;
  onLocationChange: (location: GeoPoint | null) => void;
  address: string;
  onAddressChange: (value: string) => void;
  zone: string;
  onZoneChange: (value: string) => void;
}

function createMap(
  container: HTMLElement,
  center: [number, number],
): L.Map {
  const map = L.map(container, { center, zoom: DEFAULT_ZOOM });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  return map;
}

function syncMarker(
  point: GeoPoint,
  map: L.Map,
  markerRef: React.MutableRefObject<L.Marker | null>,
): void {
  const latlng: [number, number] = [point.y, point.x];
  if (markerRef.current === null) {
    const marker = L.marker(latlng, { icon: PIN_ICON });
    marker.addTo(map);
    markerRef.current = marker;
  } else {
    markerRef.current.setLatLng(latlng);
  }
}

/**
 * Pestaña de Ubicación de la configuración del comercio:
 * captura GPS en tiempo real, vista previa con pin en el mapa y
 * campos de texto opcionales para referencias.
 */
export function LocationSettingsForm({
  location,
  onLocationChange,
  address,
  onAddressChange,
  zone,
  onZoneChange,
}: LocationSettingsFormProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const isMountedRef = useRef(true);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Flag de vida del componente: las promesas de geolocalización / geocoding
  // pueden resolverse tras el desmontaje y jamás deben tocar estado ni refs.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleMapClick = useCallback(
    async (e: L.LeafletMouseEvent) => {
      const latlng = e.latlng;
      const point: GeoPoint = { x: latlng.lng, y: latlng.lat };
      onLocationChange(point);
      if (mapInstanceRef.current !== null) {
        syncMarker(point, mapInstanceRef.current, markerRef);
      }

      // Reverse geocoding for map click
      const fullAddress = await reverseGeocode(point.y, point.x);
      if (!isMountedRef.current) return;
      if (fullAddress) {
        onAddressChange(fullAddress);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.y}&lon=${point.x}&addressdetails=1`,
          { headers: { 'Accept-Language': 'es,en;q=0.9' } }
        );
        if (response.ok) {
          const data = await response.json();
          const zoneParts = [
            data.address?.suburb,
            data.address?.neighbourhood,
            data.address?.city,
          ].filter(Boolean);
          if (zoneParts.length > 0) {
            onZoneChange(zoneParts[0]);
          }
        }
      }
    },
    [onLocationChange, onAddressChange, onZoneChange]
  );

  useEffect(() => {
    if (mapRef.current === null) return;

    if (mapInstanceRef.current === null) {
      const map = createMap(
        mapRef.current,
        location !== null ? [location.y, location.x] : NEUTRAL_CENTER,
      );
      map.on('click', handleMapClick);
      mapInstanceRef.current = map;
    }
    const map = mapInstanceRef.current;
    if (map === null) return;

    if (location !== null) {
      syncMarker(location, map, markerRef);
    }

    return () => {
      if (markerRef.current !== null) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.off('click', handleMapClick);
    };
  }, [location, handleMapClick]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current !== null) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleUseCurrentLocation = async (): Promise<void> => {
    setIsLocating(true);
    setGpsError(null);
    try {
      if (!isGeolocationSupported()) {
        throw new Error(GEOLOCATION_UNSUPPORTED_MESSAGE);
      }
      const point = await getCurrentGeoPoint();
      if (!isMountedRef.current) return;
      onLocationChange(point);
      if (mapInstanceRef.current !== null) {
        syncMarker(point, mapInstanceRef.current, markerRef);
        mapInstanceRef.current.flyTo([point.y, point.x], CAPTURED_ZOOM);
      }

      // Reverse geocoding to auto-fill address and zone
      const fullAddress = await reverseGeocode(point.y, point.x);
      if (!isMountedRef.current) return;
      if (fullAddress) {
        onAddressChange(fullAddress);
        // Extract zone from address components (city, suburb, neighbourhood)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.y}&lon=${point.x}&addressdetails=1`,
          { headers: { 'Accept-Language': 'es,en;q=0.9' } }
        );
        if (response.ok) {
          const data = await response.json();
          const zoneParts = [
            data.address?.suburb,
            data.address?.neighbourhood,
            data.address?.city,
          ].filter(Boolean);
          if (zoneParts.length > 0) {
            onZoneChange(zoneParts[0]);
          }
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        setGpsError(resolveGeolocationErrorMessage(error));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLocating(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <section aria-label="Ubicación GPS del comercio">
        <button
          type="button"
          data-testid="use-current-location"
          onClick={() => void handleUseCurrentLocation()}
          disabled={isLocating}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLocating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Obteniendo ubicación...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              Usar mi ubicación actual
            </>
          )}
        </button>

        {gpsError !== null && (
          <p
            role="alert"
            data-testid="geolocation-error"
            className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {gpsError}
          </p>
        )}

        {location !== null && (
          <p
            data-testid="captured-coordinates"
            className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            Ubicación capturada — Lat:{' '}
            <span data-testid="latitude">{location.y.toFixed(6)}</span>, Long:{' '}
            <span data-testid="longitude">{location.x.toFixed(6)}</span>.
            Confirma en el mapa que el pin esté exactamente frente a tu negocio.
          </p>
        )}
      </section>

      <div
        ref={mapRef}
        data-testid="location-map-preview"
        aria-label="Vista previa del mapa con la ubicación del negocio"
        role="application"
        className="h-64 w-full rounded-xl border border-gray-200"
      />

      <p className="text-xs text-gray-500">
        También puedes hacer clic directamente sobre el mapa para ajustar el
        pin manualmente.
      </p>

      <div>
        <label
          htmlFor="merchant-address"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Dirección / Referencia
        </label>
        <input
          id="merchant-address"
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Ej. Frente a la plaza, al lado de la panadería..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Campo opcional para detalles que ayuden al repartidor a encontrarte.
        </p>
      </div>

      <div>
        <label
          htmlFor="merchant-zone"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Zona
        </label>
        <input
          id="merchant-zone"
          type="text"
          value={zone}
          onChange={(e) => onZoneChange(e.target.value)}
          placeholder="Ej. Centro, La Candelaria..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

export default LocationSettingsForm;
