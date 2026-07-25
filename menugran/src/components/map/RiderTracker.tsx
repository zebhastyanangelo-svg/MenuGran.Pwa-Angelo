"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const riderIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RiderLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface RiderTrackerProps {
  orderId: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryAddress?: string | null;
  riderName?: string | null;
  pollInterval?: number;
}

function FlyToRider({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, map.getZoom(), { duration: 1 });
  }, [position, map]);
  return null;
}

export default function RiderTracker({
  orderId,
  deliveryLat,
  deliveryLng,
  deliveryAddress,
  riderName,
  pollInterval = 5000,
}: RiderTrackerProps) {
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLocation = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/rider-location`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.data) {
          setRiderLocation(data.data);
          setLastUpdate(new Date());
          setError(null);
        }
      } catch {
        if (isMounted) setError("Error al obtener ubicacion");
      }
    };

    fetchLocation();
    intervalRef.current = setInterval(fetchLocation, pollInterval);

    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId, pollInterval]);

  // Default center: delivery address or Bucaramanga, Colombia
  const center: [number, number] =
    riderLocation
      ? [riderLocation.latitude, riderLocation.longitude]
      : deliveryLat && deliveryLng
      ? [deliveryLat, deliveryLng]
      : [7.1193, -73.1224];

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-soft">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium">
              {riderName ? `Repartidor: ${riderName}` : "Repartidor en camino"}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-xs opacity-80">
              Actualizado {lastUpdate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="h-[300px] relative">
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom={false}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {riderLocation && (
            <>
              <FlyToRider position={[riderLocation.latitude, riderLocation.longitude]} />
              <Marker
                position={[riderLocation.latitude, riderLocation.longitude]}
                icon={riderIcon}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{riderName || "Repartidor"}</p>
                    <p className="text-xs text-neutral-500">En camino</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {deliveryLat && deliveryLng && (
            <Marker position={[deliveryLat, deliveryLng]}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-sm">Destino</p>
                  {deliveryAddress && (
                    <p className="text-xs text-neutral-500">{deliveryAddress}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-danger/90 text-white text-xs px-3 py-2 rounded-lg text-center">
            {error}
          </div>
        )}

        {!riderLocation && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100/80">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-neutral-500">Esperando ubicacion del repartidor...</p>
            </div>
          </div>
        )}
      </div>

      {/* ETA info */}
      {riderLocation && deliveryLat && deliveryLng && (
        <div className="px-4 py-3 border-t border-neutral-100">
          <RiderDistanceInfo
            riderLat={riderLocation.latitude}
            riderLng={riderLocation.longitude}
            destLat={deliveryLat}
            destLng={deliveryLng}
          />
        </div>
      )}
    </div>
  );
}

function RiderDistanceInfo({
  riderLat,
  riderLng,
  destLat,
  destLng,
}: {
  riderLat: number;
  riderLng: number;
  destLat: number;
  destLng: number;
}) {
  const [distance, setDistance] = useState<string>("");

  useEffect(() => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(destLat - riderLat);
    const dLon = toRad(destLng - riderLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(riderLat)) * Math.cos(toRad(destLat)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    const km = R * c;

    if (km < 1) {
      setDistance(`${Math.round(km * 1000)} m`);
    } else {
      setDistance(`${km.toFixed(1)} km`);
    }
  }, [riderLat, riderLng, destLat, destLng]);

  const etaMinutes = Math.round(
    (parseFloat(distance) || 0) / 30 * 60
  );

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-neutral-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{distance} de distancia</span>
      </div>
      <span className="text-brand-600 font-medium">
        ~{etaMinutes > 0 ? etaMinutes : 1} min
      </span>
    </div>
  );
}
