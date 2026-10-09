/**
 * Panel de seguimiento del repartidor, estilo GPS de navegación.
 *
 * Es la vista del cliente: el mapa ocupa la tarjeta con el HUD flotante de
 * navegación encima —barra de instrucciones, botones laterales (audio,
 * brújula, centrar) y la tarjeta inferior con los datos del repartidor y la
 * acción de confirmar la entrega.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapView } from '../map/MapView';
import type { MapMarker } from '../map/MapView';
import {
  NavigationInstructionBar,
  NavigationSideControls,
  NavigationPersonCard,
} from '../map/NavigationTrackingOverlay';
import { fetchOsrmRouteDetails, type OsrmRouteDetails } from '../../utils/osrmRoute';
import {
  buildEtaLine,
  buildNavigationInstruction,
  shouldRefetchRoute,
} from '../../utils/navigationInstruction';
import { speakNavigationInstruction, stopNavigationSpeech } from '../../utils/voiceGuidance';
import { PackageCheck } from 'lucide-react';
import type { GeoPoint } from '../../types/database';

const NAVIGATION_ZOOM = 16;

const DRIVER_PIN_ICON = L.divIcon({
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

const DESTINATION_PIN_ICON = L.divIcon({
  className: 'custom-marker',
  html: `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13401 2 5 5.13401 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13401 15.866 2 12 2Z" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="9" r="3" fill="#ef4444"/>
    </svg>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

export interface DriverNavigationPanelProps {
  /** Ubicación del repartidor en tiempo real (broadcast), si llegó alguna. */
  driverLocation: GeoPoint | null;
  /** Punto de entrega del pedido. */
  destination: GeoPoint;
  /** Nombre del repartidor; sin perfil cargado se muestra un genérico. */
  driverName: string | null;
  driverPhone: string | null;
  driverAvatarUrl: string | null;
  /** Código corto del pedido, para el detalle de la tarjeta. */
  orderCode: string;
  /** Etiqueta legible del estado actual. */
  statusLabel: string;
  /** Si el cliente puede confirmar la recepción ahora. */
  canConfirmDelivery: boolean;
  isConfirming: boolean;
  onConfirmDelivery: () => void;
}

export function DriverNavigationPanel({
  driverLocation,
  destination,
  driverName,
  driverPhone,
  driverAvatarUrl,
  orderCode,
  statusLabel,
  canConfirmDelivery,
  isConfirming,
  onConfirmDelivery,
}: DriverNavigationPanelProps) {
  const [muted, setMuted] = useState(true);
  const [routeDetails, setRouteDetails] = useState<OsrmRouteDetails | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lastFetchOriginRef = useRef<[number, number] | null>(null);
  const lastSpokenInstructionRef = useRef('');

  useEffect(() => () => stopNavigationSpeech(), []);

  const driverCoords: [number, number] | null = useMemo(() => {
    if (driverLocation === null) return null;
    return [driverLocation.y, driverLocation.x];
  }, [driverLocation]);

  const destinationCoords = useMemo<[number, number]>(
    () => [destination.y, destination.x],
    [destination],
  );

  useEffect(() => {
    if (driverCoords === null) {
      setRouteDetails(null);
      lastFetchOriginRef.current = null;
      return
    }

    if (!shouldRefetchRoute(lastFetchOriginRef.current, driverCoords)) return
    lastFetchOriginRef.current = driverCoords;

    let cancelled = false;
    void fetchOsrmRouteDetails(driverCoords, destinationCoords).then((details) => {
      if (!cancelled) setRouteDetails(details);
    });
    return () => {
      cancelled = true;
    };
  }, [driverCoords, destinationCoords]);

  const instruction = useMemo(() => {
    if (routeDetails === null || routeDetails.steps.length === 0) return null;
    return buildNavigationInstruction(routeDetails.steps[0]);
  }, [routeDetails]);

  useEffect(() => {
    if (muted || instruction === null) return;
    if (lastSpokenInstructionRef.current === instruction.text) return;
    lastSpokenInstructionRef.current = instruction.text;
    speakNavigationInstruction(instruction.text);
  }, [muted, instruction]);

  useEffect(() => {
    if (muted) stopNavigationSpeech();
  }, [muted]);

  const markers = useMemo<MapMarker[]>(() => {
    const result: MapMarker[] = [
      {
        id: 'destination',
        position: destinationCoords,
        title: 'Destino de entrega',
        subtitle: 'Tu dirección',
        icon: DESTINATION_PIN_ICON,
      },
    ];

    if (driverCoords !== null) {
      result.push({
        id: 'driver',
        position: driverCoords,
        title: 'Repartidor',
        subtitle: 'Ubicación en tiempo real',
        icon: DRIVER_PIN_ICON,
      });
    }

    return result;
  }, [destinationCoords, driverCoords]);

  const handleReorient = () => {
    const target = driverCoords ?? destinationCoords;
    mapRef.current?.setView(target, NAVIGATION_ZOOM);
  };

  const handleCenter = () => {
    const target = driverCoords ?? destinationCoords;
    mapRef.current?.panTo(target);
  };

  const handleToggleMute = () => {
    setMuted((previous) => !previous);
  };

  const etaLine = routeDetails !== null
    ? buildEtaLine(routeDetails.durationSeconds, routeDetails.distanceMeters)
    : buildEtaLine(0, 0);

  const primaryAction = canConfirmDelivery ? (
    <button
      type="button"
      onClick={onConfirmDelivery}
      disabled={isConfirming}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      data-testid="confirm-delivery"
    >
      <PackageCheck className="h-5 w-5" aria-hidden="true" />
      Confirmar pedido recibido
    </button>
  ) : (
    <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-700">
      Tu repartidor está en camino. Te avisaremos al llegar.
    </p>
  );

  return (
    <section
      className="relative mb-8 h-[30rem] overflow-hidden rounded-2xl border border-gray-200 shadow-md"
      data-testid="driver-navigation-panel"
      aria-label="Seguimiento del repartidor"
    >
      <MapView
        markers={markers}
        center={driverCoords ?? destinationCoords}
        zoom={driverCoords !== null ? NAVIGATION_ZOOM : 15}
        userLocation={driverCoords}
        followUserLocation
        route={routeDetails?.coordinates}
        onMapReady={(map) => {
          mapRef.current = map;
        }}
        className="absolute inset-0"
        showFallback
        fallbackMessage="Esperando ubicación del repartidor..."
      />

      {instruction !== null && (
        <div className="absolute inset-x-0 top-3">
          <NavigationInstructionBar
            icon={instruction.icon}
            text={instruction.text}
            distanceLabel={instruction.distanceLabel}
          />
        </div>
      )}

      <NavigationSideControls
        muted={muted}
        onToggleMute={handleToggleMute}
        onReorient={handleReorient}
        onCenter={handleCenter}
        positionClass={instruction !== null ? 'right-3 top-44' : 'right-3 top-20'}
        centerButtonClass="bottom-[264px] right-3"
      />

      <NavigationPersonCard
        etaLine={etaLine}
        sectionLabel="REPARTIDOR:"
        name={driverName ?? 'Repartidor asignado'}
        verified
        rating={null}
        avatarUrl={driverAvatarUrl}
        detailLabel={`Pedido ${orderCode} · ${statusLabel}`}
        phone={driverPhone}
        primaryAction={primaryAction}
      />
    </section>
  );
}
