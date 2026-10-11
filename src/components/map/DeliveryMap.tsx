/**
 * Mapa de seguimiento del repartidor en tiempo real (estilo navegación).
 *
 * Sobre `MapView` añade tres piezas:
 *  1. Marcador animado de vehículo/moto en vez del círculo básico.
 *  2. Rumbo (heading) entre la posición GPS anterior y la actual, aplicado
 *     como rotación CSS para que la moto apunte siempre hacia el movimiento.
 *  3. Modo `followRider`: la cámara sigue al repartidor en cada tick del GPS.
 *
 * Nota 3D: el motor de mapas es Leaflet con tiles de OpenStreetMap, que no
 * soporta perspectiva/inclinación de cámara (pitch). El "seguimiento estilo
 * navegación" se logra con el centrado automático y el zoom de calle; migrar
 * a un motor con pitch (Mapbox GL) sería el camino si se exige la vista 3D.
 */

import { useCallback, useMemo } from 'react';
import L from 'leaflet';
import { MapView } from './MapView';
import type { MapMarker, MapViewProps } from './MapView';

/** Moto estilizada vista desde arriba; apunta al norte (0°) por defecto. */
const RIDER_SVG = `
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="16" fill="rgba(16,185,129,0.18)" stroke="#10b981" stroke-width="1.5"/>
    <ellipse cx="18" cy="7" rx="4.5" ry="6" fill="#065f46"/>
    <ellipse cx="18" cy="29" rx="4.5" ry="6" fill="#065f46"/>
    <rect x="13.5" y="13" width="9" height="10" rx="3" fill="#10b981"/>
    <path d="M10 10 L18 6.5 L26 10" stroke="#047857" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="18" cy="17.5" r="2.2" fill="#ffffff"/>
  </svg>
`;

/** Rotación CSS aplicada al icono: suaviza el giro entre fixes del GPS. */
const RIDER_ROTATION_TRANSITION = 'transition: transform 0.4s ease-out;';

/**
 * Rumbo en grados [0, 360) entre dos posiciones GPS (lat, lng).
 *
 * `atan2(dLon, dLat)` mide el ángulo desde el norte (0°), hacia el este
 * (90°): exactamente el convenio de brújula que espera la rotación del
 * icono. Devuelve `null` sin posición previa o sin movimiento, para no
 * girar la moto por jitter del GPS.
 */
export function calculateHeadingDegrees(
  previous: readonly [number, number] | null,
  current: readonly [number, number] | null,
): number | null {
  if (previous === null || current === null) return null;

  const [previousLat, previousLng] = previous;
  const [currentLat, currentLng] = current;
  if (previousLat === currentLat && previousLng === currentLng) return null;

  const deltaLat = currentLat - previousLat;
  const deltaLng = currentLng - previousLng;
  const heading = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI;
  return (heading + 360) % 360;
}

/**
 * Icono Leaflet de la moto, rotado hacia el rumbo.
 *
 * Sin rumbo (`null`) la moto queda apuntando al norte.
 */
export function buildRiderIcon(headingDegrees: number | null): L.DivIcon {
  const rotationStyle = headingDegrees === null
    ? ''
    : `transform: rotate(${headingDegrees.toFixed(1)}deg);`;

  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="rider-marker" style="${rotationStyle} ${RIDER_ROTATION_TRANSITION}">${RIDER_SVG}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export interface DeliveryMapProps {
  /** Posición GPS actual del repartidor (lat, lng). */
  riderPosition: [number, number] | null;
  /** Posición GPS anterior; con ella se calcula el rumbo del movimiento. */
  previousRiderPosition?: [number, number] | null;
  /** Marcadores adicionales (destino, comercio, …). */
  markers?: readonly MapMarker[];
  route?: MapViewProps['route'];
  routeRequest?: MapViewProps['routeRequest'];
  /** Centrado automático: la cámara sigue al repartidor en tiempo real. */
  followRider?: boolean;
  zoom?: number;
  className?: string;
  showFallback?: boolean;
  fallbackMessage?: string;
  /** Instancia cruda de Leaflet para controles imperativos del HUD. */
  onMapReady?: (map: L.Map) => void;
  /** Título del marcador del repartidor. */
  riderTitle?: string;
}

export function DeliveryMap({
  riderPosition,
  previousRiderPosition = null,
  markers = [],
  route,
  routeRequest,
  followRider = true,
  zoom = 16,
  className = 'h-64 w-full',
  showFallback = true,
  fallbackMessage = 'Esperando la posición del repartidor...',
  onMapReady,
  riderTitle = 'Repartidor',
}: DeliveryMapProps) {
  const heading = useMemo(
    () => calculateHeadingDegrees(previousRiderPosition, riderPosition),
    [previousRiderPosition, riderPosition],
  );

  const riderIcon = useMemo(() => buildRiderIcon(heading), [heading]);

  // Sin seguimiento la cámara queda anclada al primer marcador (el destino):
  // MapView recentra en cada cambio, así que un `center` móvil anularía el
  // modo estático. Con seguimiento, el centro es el propio repartidor.
  const center = followRider
    ? riderPosition ?? markers[0]?.position
    : markers[0]?.position;

  const handleMapReady = useCallback(
    (map: L.Map) => {
      onMapReady?.(map);
    },
    [onMapReady],
  );

  return (
    <div
      className={className}
      data-testid="delivery-map"
      data-follow={String(followRider)}
      data-heading={heading === null ? '' : String(Math.round(heading))}
    >
      <MapView
        markers={markers}
        center={center}
        zoom={zoom}
        userLocation={riderPosition}
        userLocationIcon={riderIcon}
        userLocationTitle={riderTitle}
        followUserLocation={followRider}
        route={route}
        routeRequest={routeRequest}
        className="h-full w-full"
        showFallback={showFallback}
        fallbackMessage={fallbackMessage}
        onMapReady={handleMapReady}
      />
    </div>
  );
}
