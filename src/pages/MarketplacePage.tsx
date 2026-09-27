import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, X, AlertCircle } from 'lucide-react';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { GeoPoint, MerchantRow } from '../types/database';
import { SearchBar } from '../components/marketplace/SearchBar';
import { MerchantCard } from '../components/marketplace/MerchantCard';
import { MarketplaceSkeleton } from '../components/marketplace/MarketplaceSkeleton';
import {
  getCurrentGeoPoint,
  isGeolocationSupported,
  resolveGeolocationErrorMessage,
} from '../utils/geolocation';
import {
  haversineDistance,
} from '../utils/distance';
import { isValidGeoPoint } from '../utils/geo';

const MAX_DELIVERY_RADIUS_KM = 1;

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from(TABLE_NAMES.merchants)
        .select('*')
        .eq('is_active', true)
        .eq('status', 'active');

      if (supabaseError) throw supabaseError;

      setMerchants((data as MerchantRow[]) ?? []);
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
      return;
    }

    let cancelled = false;
    setIsLocating(true);

    getCurrentGeoPoint()
      .then((point) => {
        if (!cancelled) {
          setUserLocation(point);
          setLocationError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLocationError(resolveGeolocationErrorMessage(err));
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
    const bySearch = merchantsWithDistance.filter((m) =>
      m.merchant.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Always filter by 1km radius if user location is available
    if (userLocation === null) {
      return bySearch;
    }

    return bySearch.filter(
      (m) => m.distance !== null && m.distance <= MAX_DELIVERY_RADIUS_KM,
    );
  }, [merchantsWithDistance, searchQuery, userLocation]);

  const handleMerchantClick = useCallback(
    (merchant: MerchantRow) => {
      navigate(`/merchant/${merchant.id}`);
    },
    [navigate],
  );

  const hasGps = userLocation !== null;
  const noMerchantsInRadius = hasGps && filteredMerchants.length === 0 && merchants.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-bold text-slate-900">MenuGram</h1>
          <p className="text-xs text-slate-500">Descubre comercios y menús</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
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

        {noMerchantsInRadius && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1">
              No hay comercios disponibles dentro del radio de 1 km de tu ubicación actual.
              <br />
              Prueba mover el pin de tu ubicación en el checkout o ampliar tu zona de búsqueda.
            </span>
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
              <p className="col-span-full py-8 text-center text-sm text-gray-500">
                {hasGps
                  ? 'No se encontraron comercios dentro de 1 km de tu ubicación.'
                  : 'No se encontraron comercios.'}
              </p>
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
