import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { CategoryRow, MerchantRow, ProductRow } from '../types/database';
import { SearchBar } from '../components/marketplace/SearchBar';
import { CategoryFilter } from '../components/marketplace/CategoryFilter';
import { MerchantCard } from '../components/marketplace/MerchantCard';
import { ProductCard } from '../components/marketplace/ProductCard';
import { MarketplaceSkeleton } from '../components/marketplace/MarketplaceSkeleton';

export function MarketplacePage() {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'merchants' | 'products'>('merchants');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mRes, cRes, pRes] = await Promise.all([
        supabase
          .from(TABLE_NAMES.merchants)
          .select('*')
          .eq('is_active', true)
          .eq('status', 'active'),
        supabase.from(TABLE_NAMES.categories).select('*').order('sort_order'),
        supabase.from(TABLE_NAMES.products).select('*').eq('is_available', true),
      ]);

      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;

      setMerchants((mRes.data as MerchantRow[]) ?? []);
      setCategories((cRes.data as CategoryRow[]) ?? []);
      setProducts((pRes.data as ProductRow[]) ?? []);
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
    return merchants.filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [merchants, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategoryId === null || p.category_id === selectedCategoryId;
      const matchesQuery =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategoryId, searchQuery]);

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

        <div className="mt-3">
          <CategoryFilter
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </div>

        <div className="mt-4 flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('merchants')}
            className={`flex-1 pb-2 text-center text-sm font-semibold ${
              activeTab === 'merchants'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Comercios ({filteredMerchants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex-1 pb-2 text-center text-sm font-semibold ${
              activeTab === 'products'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Productos ({filteredProducts.length})
          </button>
        </div>

        {isLoading ? (
          <MarketplaceSkeleton />
        ) : error ? (
          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void fetchData()}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              Reintentar
            </button>
          </div>
        ) : activeTab === 'merchants' ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredMerchants.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-gray-500">
                No se encontraron comercios.
              </p>
            ) : (
              filteredMerchants.map((merchant) => (
                <MerchantCard key={merchant.id} merchant={merchant} />
              ))
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {filteredProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No se encontraron productos.
              </p>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
