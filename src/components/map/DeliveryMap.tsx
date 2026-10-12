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

/**
 * Puck de navegación MenuGran: halo rojo translúcido, disco blanco con borde
 * corporativo y moto roja apuntando al norte (0°). La rotación CSS lo
 * orienta hacia el rumbo real del movimiento.
 */
const RIDER_SVG = `<div style="width:40px;height:40px;border-radius:50%;background:rgba(199,21,35,.22);display:flex;align-items:center;justify-content:center;"><div style="width:30px;height:30px;border-radius:50%;background:#ffffff;border:2.5px solid #C71523;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-motorcycle" style="color:#C71523;font-size:13px;"></i></div></div>`;

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
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
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
