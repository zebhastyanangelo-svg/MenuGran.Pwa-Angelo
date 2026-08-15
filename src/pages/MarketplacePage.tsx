import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { MerchantRow } from '../types/database';
import { SearchBar } from '../components/marketplace/SearchBar';
import { MerchantCard } from '../components/marketplace/MerchantCard';
import { MarketplaceSkeleton } from '../components/marketplace/MarketplaceSkeleton';

export function MarketplacePage() {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [merchants, searchQuery]);

  const handleMerchantClick = useCallback(
    (merchant: MerchantRow) => {
      navigate(`/merchant/${merchant.id}`);
    },
    [navigate],
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-bold text-gray-900">MenuGram</h1>
          <p className="text-xs text-gray-500">Descubre comercios y menús</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {isLoading ? (
          <MarketplaceSkeleton />
        ) : error ? (
          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void fetchData()}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredMerchants.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-gray-500">
                No se encontraron comercios.
              </p>
            ) : (
              filteredMerchants.map((merchant) => (
                <MerchantCard
                  key={merchant.id}
                  merchant={merchant}
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
