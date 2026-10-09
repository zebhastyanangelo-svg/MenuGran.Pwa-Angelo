/**
 * Panel de rastreo de delivery para el cliente (vista panorámica).
 *
 * A diferencia de la navegación paso a paso del repartidor (flechas de
 * maniobra y guía de voz), aquí el cliente ve el mapa completo de la entrega:
 * el comercio, el repartidor en tiempo real y su dirección, unidos por la ruta
 * trazada. La tarjeta inferior es colapsable, guarda el código de entrega y la
 * confirmación de recepción, y puede minimizarse para despejar el mapa.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronUp,
  Crosshair,
  Eye,
  PackageCheck,
  Phone,
  X,
} from 'lucide-react';
import { MapView } from '../map/MapView';
import type { MapMarker } from '../map/MapView';
import { fetchOsrmRouteDetails, type OsrmRouteDetails } from '../../utils/osrmRoute';
import { buildEtaLine, shouldRefetchRoute } from '../../utils/navigationInstruction';
import type { GeoPoint } from '../../types/database';

const TRACKING_ZOOM = 13;

const MERCHANT_PIN_ICON = L.divIcon({
  className: 'custom-marker',
  html: `
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#2563eb"/>
      <path d="M8.5 8.5h7v1.6h-7zM9 11h6v4.2H9z" fill="white"/>
    </svg>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

const DRIVER_PIN_ICON = L.divIcon({
  className: 'custom-marker',
  html: `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2" fill="#10b981"/>
      <path d="M12 8V12L15 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const DESTINATION_PIN_ICON = L.divIcon({
  className: 'custom-marker',
  html: `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13401 2 5 5.13401 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13401 15.866 2 12 2Z" fill="#ef4444"/>
      <path d="M9 13v-3.2L12 7.5l3 2.3V13h-2v-2h-2v2z" fill="white"/>
    </svg>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export interface OrderTrackingPanelProps {
  /** Ubicación del repartidor en tiempo real (broadcast), si llegó alguna. */
  driverLocation: GeoPoint | null;
  /** Punto de entrega del pedido (la dirección del cliente). */
  destination: GeoPoint;
  /** Ubicación del comercio; sin ella no se dibuja la ruta completa. */
  merchantPoint: GeoPoint | null;
  /** Nombre del repartidor; sin perfil cargado se muestra un genérico. */
  driverName: string | null;
  driverPhone: string | null;
  driverAvatarUrl: string | null;
  /** Código corto del pedido (PIN que el cliente muestra al repartidor). */
  orderCode: string;
  /** Etiqueta legible del estado actual. */
  statusLabel: string;
  /** Si el cliente puede confirmar la recepción ahora. */
  canConfirmDelivery: boolean;
  isConfirming: boolean;
  onConfirmDelivery: () => void;
  /** Cierra el mapa panorámico y vuelve a la página del pedido. */
  onClose: () => void;
}

function buildMonogram(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') return '?';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function toCoords(point: GeoPoint | null): [number, number] | null {
  return point === null ? null : [point.y, point.x];
}

/**
 * Ruta del repartidor hacia el cliente, re-consultada solo cuando el GPS se
 * desplaza lo suficiente para no martillar OSRM en cada tick.
 */
function useTrackingRoute(
  driverCoords: [number, number] | null,
  destinationCoords: [number, number],
): OsrmRouteDetails | null {
  const [routeDetails, setRouteDetails] = useState<OsrmRouteDetails | null>(null);
  const lastFetchOriginRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (driverCoords === null) {
      setRouteDetails(null);
      lastFetchOriginRef.current = null;
      return;
    }

    if (!shouldRefetchRoute(lastFetchOriginRef.current, driverCoords)) return;
    lastFetchOriginRef.current = driverCoords;

    let cancelled = false;
    void fetchOsrmRouteDetails(driverCoords, destinationCoords).then((details) => {
      if (!cancelled) setRouteDetails(details);
    });
    return () => {
      cancelled = true;
    };
  }, [driverCoords, destinationCoords]);

  return routeDetails;
}

function TrackingTopBar({
  statusLabel,
  onClose,
  onRecenter,
}: {
  statusLabel: string;
  onClose: () => void;
  onRecenter: () => void;
}) {
  const buttonClass =
    'flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-black/5 transition hover:bg-gray-50 active:scale-95';

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-black/40 to-transparent"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar mapa de seguimiento"
        data-testid="close-tracking-map"
        className={`absolute left-3 top-4 z-30 ${buttonClass}`}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <p className="absolute left-1/2 top-5 z-30 -translate-x-1/2 rounded-full bg-white/95 px-4 py-1.5 text-sm font-semibold text-gray-800 shadow-md ring-1 ring-black/5">
        {statusLabel}
      </p>
      <button
        type="button"
        onClick={onRecenter}
        aria-label="Centrar recorrido"
        data-testid="recenter-tracking"
        className={`absolute right-3 top-4 z-30 ${buttonClass}`}
      >
        <Crosshair className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-red/20 bg-brand-red/10 text-sm font-bold text-brand-red">
      {avatarUrl !== null && avatarUrl !== '' ? (
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        buildMonogram(name)
      )}
    </span>
  );
}

function DeliveryCodeRow({ orderCode }: { orderCode: string }) {
  return (
    <div
      className="mt-3 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-3 py-2"
      data-testid="tracking-delivery-code"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Código de entrega
      </span>
      <span className="font-mono text-xl font-extrabold tracking-widest text-amber-900">
        {orderCode}
      </span>
    </div>
  );
}

interface TrackingCardSharedProps {
  etaLine: string;
  orderCode: string;
  statusLabel: string;
  driverName: string;
  driverPhone: string | null;
  driverAvatarUrl: string | null;
  canConfirmDelivery: boolean;
  isConfirming: boolean;
  onConfirmDelivery: () => void;
}

function TrackingCardHeader({
  expanded,
  etaLine,
  driverName,
  statusLabel,
  avatarUrl,
  onToggle,
  onMinimize,
}: {
  expanded: boolean;
  etaLine: string;
  driverName: string;
  statusLabel: string;
  avatarUrl: string | null;
  onToggle: () => void;
  onMinimize: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        data-testid="tracking-card-toggle"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <Avatar name={driverName} avatarUrl={avatarUrl} />
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-lg font-extrabold tracking-tight text-gray-900"
            data-testid="tracking-eta"
          >
            {etaLine}
          </span>
          <span className="block truncate text-sm text-gray-600">
            <span data-testid="tracking-driver-name">{driverName}</span> · {statusLabel}
          </span>
        </span>
        <ChevronUp
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        onClick={onMinimize}
        aria-label="Ver el mapa completo"
        data-testid="minimize-tracking-card"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 active:scale-95"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function TrackingCardDetails({
  driverName,
  driverPhone,
  canConfirmDelivery,
  isConfirming,
  onConfirmDelivery,
}: Pick<
  TrackingCardSharedProps,
  'driverName' | 'driverPhone' | 'canConfirmDelivery' | 'isConfirming' | 'onConfirmDelivery'
>) {
  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3" data-testid="tracking-card-details">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          Repartidor
        </p>
        <span
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
          data-testid="tracking-driver-verified"
        >
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Verificado
        </span>
        {driverPhone !== null && driverPhone !== '' && (
          <a
            href={`tel:${driverPhone}`}
            aria-label={`Llamar a ${driverName}`}
            data-testid="tracking-driver-call"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md transition hover:bg-emerald-600 active:scale-95"
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
          </a>
        )}
      </div>

      {canConfirmDelivery ? (
        <button
          type="button"
          onClick={onConfirmDelivery}
          disabled={isConfirming}
          data-testid="confirm-delivery"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PackageCheck className="h-5 w-5" aria-hidden="true" />
          Confirmar pedido recibido
        </button>
      ) : (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-700">
          Tu repartidor está en camino. Te avisaremos al llegar.
        </p>
      )}
    </div>
  );
}

function TrackingCard(props: TrackingCardSharedProps) {
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        data-testid="restore-tracking-card"
        className="absolute inset-x-0 bottom-4 z-30 mx-auto flex w-max items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-xl ring-1 ring-black/5 transition hover:bg-gray-50 active:scale-95"
      >
        <Eye className="h-5 w-5" aria-hidden="true" />
        Ver seguimiento
      </button>
    );
  }

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl bg-white px-4 pb-4 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
      data-testid="tracking-card"
    >
      <TrackingCardHeader
        expanded={expanded}
        etaLine={props.etaLine}
        driverName={props.driverName}
        statusLabel={props.statusLabel}
        avatarUrl={props.driverAvatarUrl}
        onToggle={() => setExpanded((value) => !value)}
        onMinimize={() => setMinimized(true)}
      />
      <DeliveryCodeRow orderCode={props.orderCode} />
      {expanded && <TrackingCardDetails {...props} />}
    </div>
  );
}

export function OrderTrackingPanel({
  driverLocation,
  destination,
  merchantPoint,
  driverName,
  driverPhone,
  driverAvatarUrl,
  orderCode,
  statusLabel,
  canConfirmDelivery,
  isConfirming,
  onConfirmDelivery,
  onClose,
}: OrderTrackingPanelProps) {
  const mapRef = useRef<L.Map | null>(null);

  const driverCoords = useMemo(() => toCoords(driverLocation), [driverLocation]);
  const destinationCoords = useMemo<[number, number]>(
    () => [destination.y, destination.x],
    [destination],
  );
  const merchantCoords = useMemo(() => toCoords(merchantPoint), [merchantPoint]);

  const routeDetails = useTrackingRoute(driverCoords, destinationCoords);

  const markers = useMemo<MapMarker[]>(() => {
    const result: MapMarker[] = [
      {
        id: 'destination',
        position: destinationCoords,
        title: 'Tu dirección',
        subtitle: 'Destino de entrega',
        icon: DESTINATION_PIN_ICON,
      },
    ];
    if (merchantCoords !== null) {
      result.unshift({
        id: 'merchant',
        position: merchantCoords,
        title: 'Comercio',
        subtitle: 'Punto de retiro',
        icon: MERCHANT_PIN_ICON,
      });
    }
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
  }, [destinationCoords, merchantCoords, driverCoords]);

  const routeRequest = useMemo(
    () => (merchantCoords === null ? undefined : { from: merchantCoords, to: destinationCoords }),
    [merchantCoords, destinationCoords],
  );

  const handleRecenter = () => {
    const points = [merchantCoords, destinationCoords, driverCoords].filter(
      (point): point is [number, number] => point !== null,
    );
    if (mapRef.current !== null && points.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
    }
  };

  const etaLine =
    driverCoords === null
      ? 'Esperando al repartidor…'
      : routeDetails !== null
        ? buildEtaLine(routeDetails.durationSeconds, routeDetails.distanceMeters)
        : 'Calculando tiempo de llegada…';

  return (
    <section
      className="fixed inset-0 z-50 overflow-hidden bg-gray-900"
      data-testid="order-tracking-panel"
      aria-label="Seguimiento de la entrega en vivo"
    >
      <MapView
        markers={markers}
        center={driverCoords ?? destinationCoords}
        zoom={TRACKING_ZOOM}
        route={routeDetails?.coordinates}
        routeRequest={routeRequest}
        onMapReady={(map) => {
          mapRef.current = map;
        }}
        className="absolute inset-0"
        showFallback
        fallbackMessage="Esperando ubicación del repartidor..."
      />

      <TrackingTopBar statusLabel={statusLabel} onClose={onClose} onRecenter={handleRecenter} />

      <TrackingCard
        etaLine={etaLine}
        orderCode={orderCode}
        statusLabel={statusLabel}
        driverName={driverName ?? 'Repartidor asignado'}
        driverPhone={driverPhone}
        driverAvatarUrl={driverAvatarUrl}
        canConfirmDelivery={canConfirmDelivery}
        isConfirming={isConfirming}
        onConfirmDelivery={onConfirmDelivery}
      />
    </section>
  );
}
