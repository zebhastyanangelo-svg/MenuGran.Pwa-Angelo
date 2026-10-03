import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, X, CheckCircle, Map, Navigation2 } from 'lucide-react';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { GeoPoint, MerchantRow } from '../types/database';
import { SearchBar } from '../components/marketplace/SearchBar';
import { MerchantCard } from '../components/marketplace/MerchantCard';
import { MarketplaceSkeleton } from '../components/marketplace/MarketplaceSkeleton';
import { LocationPicker } from '../components/map/LocationPicker';
import {
  getCurrentGeoPoint,
  isGeolocationSupported,
  resolveGeolocationErrorMessage,
} from '../utils/geolocation';
import {
  haversineDistance,
} from '../utils/distance';
import { isValidGeoPoint } from '../utils/geo';
import { parseGeoPoint } from '../utils/geoPoint';

const COVERAGE_RADIUS_KM = 1.0;

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface MerchantWithDistance {
  merchant: MerchantRow;
  distance: number | null;
}

function computeDistances(
  merchants: MerchantRow[],
  userLocation: GeoPoint | null,
): MerchantWithDistance[] {
  const hasValidUserLocation = isValidGeoPoint(userLocation);

  return merchants.map((m) => {
    if (!hasValidUserLocation || !isValidGeoPoint(m.location)) {
      return { merchant: m, distance: null };
    }

    try {
      const result = haversineDistance(userLocation!, m.location);
      return { merchant: m, distance: result.km };
    } catch (err) {
      console.warn('Error calculando distancia para comercio:', m.id, err);
      return { merchant: m, distance: null };
    }
  });
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');

const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from(TABLE_NAMES.merchants)
        .select('id, name, slug, logo_url, banner_url, status, is_active, is_open, location, created_at, rif, category, description, address, zone, phone_whatsapp, service_modalities, business_hours, pago_movil_bank, pago_movil_id_number, pago_movil_phone, opening_time, closing_time')
        .eq('is_active', true)
        .eq('status', 'active');

      if (supabaseError) throw supabaseError;

      const rawMerchants = (data as Partial<MerchantRow>[]) ?? [];
      const merchantsData = rawMerchants.map((m) => ({
        ...m,
        location: parseGeoPoint(m.location),
      })) as MerchantRow[];

      console.debug('[Marketplace] merchants raw:', merchantsData.map(m => ({
        id: m.id,
        name: m.name,
        latitude: m.location?.y,
        longitude: m.location?.x,
      })));
      setMerchants(merchantsData);
    } catch (err) {
      console.error('Error al cargar datos del marketplace:', err);
      setError('Ocurrió un error al cargar la información. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isGeolocationSupported()) {
      setLocationError(
        'Tu navegador no soporta geolocalización. Puedes explorar todos los comercios.',
      );
      setPermissionState('unsupported');
      return;
    }

    // Check permission state
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((perm) => {
        setPermissionState(perm.state as PermissionState);
        perm.onchange = () => setPermissionState(perm.state as PermissionState);
      })
      .catch(() => {
        // fallback if permissions API not available
        setPermissionState('prompt');
      });

    let cancelled = false;
    setIsLocating(true);

    getCurrentGeoPoint()
      .then((point) => {
        if (!cancelled) {
          setUserLocation(point);
          setLocationError(null);
          setPermissionState('granted');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLocationError(resolveGeolocationErrorMessage(err));
          // If denied, permissionState will be updated via permissions API or we infer
          if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 1) {
            setPermissionState('denied');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLocating(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const merchantsWithDistance = useMemo(
    () => computeDistances(merchants, userLocation),
    [merchants, userLocation],
  );

  const filteredMerchants = useMemo(() => {
    // apply search filter first
    const bySearch = merchantsWithDistance.filter((m) =>
      m.merchant.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // sort by distance (null last) for better UX
    const sorted = [...bySearch].sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    // If we don't have a user location yet, show all matching merchants (no radius filter)
    if (!userLocation) return sorted;

    // Apply coverage radius 1 km
    const nearby = sorted.filter(
      (m) => m.distance !== null && m.distance <= COVERAGE_RADIUS_KM,
    );

    return nearby;
  }, [merchantsWithDistance, searchQuery, userLocation]);

  const handleMerchantClick = useCallback(
    (merchant: MerchantRow) => {
      navigate(`/merchant/${merchant.id}`);
    },
    [navigate],
  );

  const handleUserLocationChange = useCallback((location: GeoPoint | null) => {
    if (location) {
      setUserLocation(location);
      setPermissionState('granted');
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!isGeolocationSupported()) return;
    setIsLocating(true);
    setLocationError(null);
    getCurrentGeoPoint()
      .then((point) => {
        setUserLocation(point);
        setPermissionState('granted');
      })
      .catch((err) => {
        setLocationError(resolveGeolocationErrorMessage(err));
        if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 1) {
          setPermissionState('denied');
        }
      })
      .finally(() => setIsLocating(false));
  }, []);

  

  // coverage summary
  const nearbyCount = useMemo(
    () => merchantsWithDistance.filter((m) => m.distance !== null && m.distance <= COVERAGE_RADIUS_KM).length,
    [merchantsWithDistance],
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-bold text-slate-900">MenuGran</h1>
          <p className="text-xs text-slate-500">Descubre comercios y menús</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {/* Interactive Location Picker with Map */}
        <section className="mb-4" aria-label="Selector de ubicación del cliente">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Map className="h-4 w-4" aria-hidden="true" />
              Tu ubicación de entrega
            </h2>
            {userLocation && (
              <div className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Ubicación capturada — Lat: {userLocation.y.toFixed(6)}, Long: {userLocation.x.toFixed(6)}</span>
              </div>
            )}
          </div>
          <LocationPicker
            initialLocation={userLocation}
            onLocationChange={handleUserLocationChange}
            autoLocate={!userLocation}
            className="h-48 w-full rounded-xl border border-slate-200 overflow-hidden"
          />
          {userLocation && (
            <div className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Hay {nearbyCount} comercio{nearbyCount !== 1 ? 's' : ''} a menos de 1 km de ti</span>
            </div>
          )}
        </section>

        {!userLocation && (
          <div className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800 flex items-center gap-1.5">
            <Navigation2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Activa tu ubicación para ver comercios a menos de 1 km</span>
          </div>
        )}

        {/* Permission banner */}
        {(permissionState === 'prompt' || permissionState === 'denied') && userLocation === null && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <Navigation className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">Activa la ubicación para ver comercios cercanos</span>
            <button
              type="button"
              onClick={requestLocation}
              disabled={isLocating}
              className="ml-2 shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-white text-xs font-medium transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isLocating ? 'Obteniendo…' : 'Usar mi ubicación'}
            </button>
          </div>
        )}

        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {isLocating && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Navigation className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
            Buscando comercios cercanos…
          </p>
        )}

        {locationError !== null && (
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{locationError}</span>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="ml-1 shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100"
              aria-label="Cerrar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isLoading ? (
          <MarketplaceSkeleton />
        ) : error ? (
          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void fetchData()}
              className="mt-3 rounded-xl bg-brand-red px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#c80024]"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
{filteredMerchants.length === 0 ? (
                userLocation ? (
                  <div className="col-span-full py-8 text-center">
                    <p className="text-sm text-gray-500">
                      No hay comercios a menos de 1 km. Puedes ampliar tu búsqueda o cambiar tu punto de entrega.
                    </p>
                    <button
                      type="button"
                      onClick={() => setUserLocation(null)}
                      disabled={isLocating}
                      className="mt-3 rounded-xl bg-brand-red px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#c80024] disabled:opacity-50"
                    >
                      {isLocating ? 'Reajustando…' : 'Reajustar ubicación en el mapa'}
                    </button>
                  </div>
                ) : (
                  <p className="col-span-full py-8 text-center text-sm text-gray-500">
                    No se encontraron comercios.
                  </p>
                )
              ) : (
              filteredMerchants.map(({ merchant, distance }) => (
                <MerchantCard
                  key={merchant.id}
                  merchant={merchant}
                  distance={distance ?? undefined}
                  onClick={handleMerchantClick}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
