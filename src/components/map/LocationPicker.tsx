import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { GeoPoint } from '../../types/database';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 13;

const PIN_ICON = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
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

  useEffect(() => {
    if (mapRef.current === null || L === undefined) return;

    const initialCenter: [number, number] =
      initialLocation !== null
        ? [initialLocation.y, initialLocation.x]
        : userLocation !== null
          ? userLocation
          : DEFAULT_CENTER;

    if (mapInstanceRef.current === null) {
      const map = L.map(mapRef.current, {
        center: initialCenter,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      map.on('click', (e: L.LeafletMouseEvent) => {
        const latlng = e.latlng;
        const point: GeoPoint = { x: latlng.lng, y: latlng.lat };
        onLocationChange(point);
      });
    }

    const map = mapInstanceRef.current;
    if (map === null) return;

    const updateMarker = (latlng: L.LatLngExpression) => {
      if (markerRef.current === null) {
        markerRef.current = L.marker(latlng, { icon: PIN_ICON });
        markerRef.current.addTo(map);
      } else {
        markerRef.current.setLatLng(latlng);
      }
    };

    if (initialLocation !== null) {
      updateMarker([initialLocation.y, initialLocation.x]);
    }

    return () => {
      if (markerRef.current !== null) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation, onLocationChange]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current !== null) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const point: GeoPoint = { x: longitude, y: latitude };
        onLocationChange(point);
        const map = mapInstanceRef.current;
        if (map !== null) {
          map.setView([latitude, longitude], DEFAULT_ZOOM);
        }
        if (markerRef.current === null) {
          markerRef.current = L.marker([latitude, longitude], { icon: PIN_ICON });
          markerRef.current.addTo(map!);
        } else {
          markerRef.current.setLatLng([latitude, longitude]);
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
    );
  };

  return (
    <div className="relative">
      <div ref={mapRef} className={className} />
      <button
        type="button"
        onClick={handleDetectLocation}
        disabled={isLocating}
        className="absolute top-2 right-2 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-md hover:bg-gray-50 disabled:opacity-50"
      >
        {isLocating ? 'Buscando...' : 'Usar mi ubicación'}
      </button>
    </div>
  );
}
