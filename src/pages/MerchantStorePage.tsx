import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { CategoryRow, MerchantRow, ProductRow } from '../types/database';
import { ArrowLeft, MapPin, Package } from 'lucide-react';
import { CategoryFilter } from '../components/marketplace/CategoryFilter';
import { ProductCard, ProductCardSkeleton } from '../components/marketplace/ProductCard';
import { SearchBar } from '../components/marketplace/SearchBar';
import { Badge } from '../components/ui/Badge';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';

const SKELETON_COUNT = 4;

export function MerchantStorePage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const { confirmAddItem } = useCart();
  const { showToast } = useToast();

  const [merchant, setMerchant] = useState<MerchantRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBannerError, setIsBannerError] = useState(false);
  const [isLogoError, setIsLogoError] = useState(false);

  const goBack = useCallback(() => {
    navigate('/marketplace');
  }, [navigate]);

  const fetchData = useCallback(async () => {
    if (merchantId === undefined) return;

    setIsLoading(true);
    setError(null);

    try {
      const [mRes, cRes, pRes] = await Promise.all([
        supabase
          .from(TABLE_NAMES.merchants)
          .select('*')
          .eq('id', merchantId)
          .single(),
        supabase
          .from(TABLE_NAMES.categories)
          .select('*')
          .eq('merchant_id', merchantId)
          .order('sort_order'),
        supabase
          .from(TABLE_NAMES.products)
          .select('*')
          .eq('merchant_id', merchantId)
          .eq('is_available', true),
      ]);

      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;

      setMerchant((mRes.data as MerchantRow) ?? null);
      setCategories((cRes.data as CategoryRow[]) ?? []);
      setProducts((pRes.data as ProductRow[]) ?? []);
    } catch (err) {
      console.error('Error al cargar el comercio:', err);
      setError('Ocurrió un error al cargar el comercio. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    if (merchantId === undefined) return [];
    return products.filter((p) => {
      const matchesCategory =
        selectedCategoryId === null || p.category_id === selectedCategoryId;
      const matchesQuery =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategoryId, searchQuery, merchantId]);

  const handleAddToCart = useCallback(
    (product: ProductRow, quantity: number, notes?: string) => {
      const result = confirmAddItem(product, quantity, notes);

      if (result.action === 'cleared-then-added') {
        showToast({
          title: 'Carrito actualizado',
          message: `Se vació el carrito y se agregó ${product.title}.`,
          variant: 'info',
        });
      } else if (result.action === 'added') {
        showToast({
          title: 'Producto agregado',
          message: `${product.title} fue agregado al carrito.`,
          variant: 'success',
        });
      }
    },
    [confirmAddItem, showToast],
  );

  const isOpen = merchant?.is_active && merchant?.is_open;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-xl font-bold text-slate-900">MenuGram</h1>
            <p className="text-xs text-slate-500">Cargando comercio...</p>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-4">
          <div className="mb-4 h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mb-6 h-6 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-xl font-bold text-gray-900">MenuGram</h1>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-4">
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
        </main>
      </div>
    );
  }

  if (merchant === null) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-xl font-bold text-gray-900">MenuGram</h1>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-4">
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">Comercio no encontrado.</p>
            <button
              type="button"
              onClick={goBack}
              className="mt-3 rounded-xl bg-brand-red px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#c80024]"
            >
              Volver a comercios
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-bold text-slate-900">MenuGram</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        <button
          type="button"
          onClick={goBack}
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-red hover:text-[#c80024]"
          aria-label="Volver a comercios"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a comercios
        </button>

        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-32 w-full bg-gradient-to-r from-brand-red via-[#f64a62] to-brand-amber/80">
            {merchant.banner_url && !isBannerError ? (
              <img
                src={merchant.banner_url}
                alt={`Banner de ${merchant.name}`}
                loading="lazy"
                onError={() => setIsBannerError(true)}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="relative p-4 pt-0">
            <div className="-mt-8 mb-2 flex items-end justify-between">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md">
                {merchant.logo_url && !isLogoError ? (
                  <img
                    src={merchant.logo_url}
                    alt={`Logo de ${merchant.name}`}
                    loading="lazy"
                    onError={() => setIsLogoError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-red-50 text-lg font-bold text-brand-red">
                    {merchant.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <Badge variant={isOpen ? 'success' : 'neutral'}>
                {isOpen ? 'Abierto' : 'Cerrado'}
              </Badge>
            </div>

            <h2 className="text-lg font-bold text-slate-900">{merchant.name}</h2>
            <p className="text-xs text-slate-500">@{merchant.slug}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              {merchant.category && (
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {merchant.category}
                </span>
              )}
              {merchant.zone && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {merchant.zone}
                </span>
              )}
            </div>
          </div>
        </div>

        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {categories.length > 0 ? (
          <div className="mt-3">
            <CategoryFilter
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
            />
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Package className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                Aún no hay platillos disponibles.
              </p>
              {searchQuery && (
                <p className="text-xs text-slate-400">
                  No se encontraron resultados para "{searchQuery}".
                </p>
              )}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={categoryNameById.get(product.category_id)}
                onSelect={(p: ProductRow) => handleAddToCart(p, 1)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
