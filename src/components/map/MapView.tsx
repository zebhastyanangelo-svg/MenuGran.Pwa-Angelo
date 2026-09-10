import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { MerchantRow } from '../../types/database';
import 'leaflet/dist/leaflet.css';
import { fetchOsrmRoute } from '../../utils/osrmRoute';

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 13;

const DEFAULT_ICON = L.icon({
  iconUrl: '/logo.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export interface MapMarker {
  id: string;
  position: [number, number];
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

export interface MapViewProps {
  markers?: readonly MapMarker[];
  center?: [number, number];
  zoom?: number;
  userLocation?: [number, number] | null;
  route?: readonly [number, number][];
  routeRequest?: { from: [number, number]; to: [number, number] };
  className?: string;
}

export function MapView({
  markers = [],
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  userLocation = null,
  route,
  routeRequest,
  className = 'h-64 w-full',
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [resolvedRoute, setResolvedRoute] = useState<readonly [number, number][] | null>(null);

  const routeFrom = routeRequest?.from;
  const routeTo = routeRequest?.to;

  useEffect(() => {
    if (routeFrom === undefined || routeTo === undefined) {
      setResolvedRoute(null);
      return;
    }

    let cancelled = false;

    fetchOsrmRoute(routeFrom, routeTo).then((coords) => {
      if (!cancelled) setResolvedRoute(coords);
    });

    return () => { cancelled = true; };
  }, [routeFrom, routeTo]);

  const activeRoute = resolvedRoute ?? route ?? null;

  useEffect(() => {
    if (mapRef.current === null || L === undefined) return;

    if (mapInstanceRef.current === null) {
      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
      });
      mapInstanceRef.current = map;
    } else {
      const map = mapInstanceRef.current;
      map.setView(center, zoom);
    }

    const map = mapInstanceRef.current;
    if (map === null) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    markers.forEach((marker) => {
      const markerInstance = L.marker(marker.position, {
        icon: DEFAULT_ICON,
        title: marker.title,
      });

      const popupContent = `
        <div class="p-1 text-sm">
          <div class="font-semibold">${marker.title}</div>
          ${marker.subtitle ? `<div class="text-xs text-gray-600">${marker.subtitle}</div>` : ''}
        </div>
      `;

      markerInstance.bindPopup(popupContent);
      markerInstance.addTo(map);

      markerInstance.on('click', () => {
        if (marker.onClick) marker.onClick();
      });
    });

    if (userLocation !== null) {
      L.circleMarker(userLocation, {
        color: '#10b981',
        fillColor: '#10b981',
        radius: 6,
        weight: 2,
      }).addTo(map);
    }

    if (activeRoute && activeRoute.length >= 2) {
      L.polyline(activeRoute as [number, number][], {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 6',
      }).addTo(map);
    }
  }, [markers, center, zoom, userLocation, activeRoute]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current !== null) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className={className} />;
}

export interface MerchantMapViewProps {
  merchants: readonly MerchantRow[];
  onSelectMerchant?: (merchant: MerchantRow) => void;
  userLocation?: [number, number] | null;
  className?: string;
}

export function MerchantMapView({
  merchants,
  onSelectMerchant,
  userLocation = null,
  className = 'h-80 w-full',
}: MerchantMapViewProps) {
  const markers: MapMarker[] = merchants
    .filter((m): m is MerchantRow & { location: { x: number; y: number } } => m.location !== null)
    .map((m) => ({
      id: m.id,
      position: [m.location.y, m.location.x],
      title: m.name,
      subtitle: m.is_active ? 'Abierto' : 'Cerrado',
      onClick: onSelectMerchant ? () => onSelectMerchant(m) : undefined,
    }));

  if (markers.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">No hay comercios con ubicación disponible.</p>
      </div>
    );
  }

  const center: [number, number] = markers.length > 0
    ? [markers[0].position[0], markers[0].position[1]]
    : DEFAULT_CENTER;

  return (
    <MapView
      markers={markers}
      center={center}
      zoom={markers.length === 1 ? DEFAULT_ZOOM : 12}
      userLocation={userLocation}
      className={className}
    />
  );
}
