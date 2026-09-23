import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { MerchantRow } from '../../types/database';
import 'leaflet/dist/leaflet.css';
import { fetchOsrmRoute } from '../../utils/osrmRoute';

const DEFAULT_ZOOM = 13;

const DEFAULT_ICON = L.icon({
  iconUrl: '/logo.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const RIDER_ICON = L.divIcon({
  className: 'custom-marker',
  html: `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2" fill="#10b981"/>
      <path d="M12 8V12L15 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
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
  /** Show a friendly placeholder when no markers/coordinates are available */
  showFallback?: boolean;
  /** Custom fallback message */
  fallbackMessage?: string;
}

export function MapView({
  markers = [],
  center,
  zoom = DEFAULT_ZOOM,
  userLocation = null,
  route,
  routeRequest,
  className = 'h-64 w-full',
  showFallback = true,
  fallbackMessage = 'No hay coordenadas disponibles para mostrar el mapa.',
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

  // Determine a center for the map if not explicitly provided
  const effectiveCenter = center ??
    (markers[0]?.position) ??
    userLocation ??
    (activeRoute && activeRoute[0]) ??
    null;

  useEffect(() => {
    if (mapRef.current === null || L === undefined) return;

    if (effectiveCenter === null) return; // wait for a valid center

    if (mapInstanceRef.current === null) {
      const map = L.map(mapRef.current, {
        center: effectiveCenter,
        zoom,
        zoomControl: true,
      });
      // Add OpenStreetMap tile layer (guard for environments where L.tileLayer is unavailable)
      if (typeof L.tileLayer === 'function') {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
      }
      mapInstanceRef.current = map;
    } else {
      const map = mapInstanceRef.current;
      map.setView(effectiveCenter, zoom);
    }

    const map = mapInstanceRef.current;
    if (map === null) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    markers.forEach((marker) => {
      const markerIcon = (marker as any).icon ?? DEFAULT_ICON;
      const markerInstance = L.marker(marker.position, {
        icon: markerIcon,
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
      const riderMarker = L.marker(userLocation, {
        icon: RIDER_ICON,
        title: 'Tu ubicación',
      });
      riderMarker.bindPopup('<div class="p-1 text-sm"><div class="font-semibold">Tu ubicación</div></div>');
      riderMarker.addTo(map);
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

  // Invalidate size on mount and when container resizes (modal, tabs, etc.)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.invalidateSize();

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapRef.current) ro.observe(mapRef.current);

    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current !== null) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Show fallback when no markers, no userLocation, no route, and no center override
  const hasAnyData = markers.length > 0 || userLocation !== null || activeRoute !== null || routeRequest !== undefined;

  if (!hasAnyData && showFallback) {
    return (
      <div className={`${className} flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50`}>
        <p className="text-sm text-gray-500 text-center px-4">{fallbackMessage}</p>
      </div>
    );
  }

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

  const center = markers.length > 0
    ? markers[0].position
    : undefined;

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
