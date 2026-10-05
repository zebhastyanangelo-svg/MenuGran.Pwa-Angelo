import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { CategoryRow, MerchantRow, ProductRow } from '../types/database';
import { ArrowLeft, MapPin, Package, DollarSign, Clock } from 'lucide-react';
import { CategoryFilter } from '../components/marketplace/CategoryFilter';
import { ProductCard, ProductCardSkeleton } from '../components/marketplace/ProductCard';
import { SearchBar } from '../components/marketplace/SearchBar';
import { Badge } from '../components/ui/Badge';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import { useBCVRate } from '../hooks/useExchangeRate';
import { formatEstimatedDeliveryRange, resolveMerchantPromoChips } from '../utils/promos';

const SKELETON_COUNT = 4;

export function MerchantStorePage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const { confirmAddItem } = useCart();
  const { showToast } = useToast();
  const bcvRate = useBCVRate();

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
  const promoChips = merchant ? resolveMerchantPromoChips(merchant) : [];
  const etaLabel = merchant
    ? formatEstimatedDeliveryRange(merchant.estimated_delivery_minutes)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-xl font-bold text-slate-900">MenuGran</h1>
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
            <h1 className="text-xl font-bold text-gray-900">MenuGran</h1>
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
            <h1 className="text-xl font-bold text-gray-900">MenuGran</h1>
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
          <h1 className="text-xl font-bold text-slate-900">MenuGran</h1>
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

        {/* Cabecera: banner a sangre completa con el avatar flotando
            centrado sobre su borde inferior.
            El `overflow-hidden` vive SOLO en la caja del banner: si se
            subiera al contenedor `relative`, recortaría la mitad del logo
            que sobresale por debajo. */}
        <div className="relative">
          <div className="h-40 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-brand-red via-[#f64a62] to-brand-amber/80 sm:h-48">
            {merchant.banner_url && !isBannerError ? (
              <img
                src={merchant.banner_url}
                alt={`Banner de ${merchant.name}`}
                loading="lazy"
                onError={() => setIsBannerError(true)}
                className="h-full w-full object-cover"
              />
            ) : null}

            {promoChips.length > 0 ? (
              <div
                className="absolute left-3 top-3 flex flex-wrap gap-1.5"
                data-testid="store-promo-chips"
              >
                {promoChips.map((chip) => (
                  <span
                    key={chip.key}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none shadow-sm ${
                      chip.kind === 'discount'
                        ? 'bg-brand-red text-white'
                        : 'bg-brand-amber text-slate-900'
                    }`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* El logo se ancla al borde inferior del banner y se desplaza la mitad de
              su propia altura, así queda exactamente mitad dentro / mitad
              fuera, centrado en el eje horizontal y sin depender del alto
              del banner. El anillo blanco lo separa del banner. */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-lg">
              {merchant.logo_url && !isLogoError ? (
                <img
                  src={merchant.logo_url}
                  alt={`Logo de ${merchant.name}`}
                  loading="lazy"
                  onError={() => setIsLogoError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center bg-red-50 text-xl font-bold text-brand-red"
                  aria-hidden="true"
                >
                  {merchant.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Espacio reservado = la mitad del logo que sobresale (½ de h-20 =
            2.5rem). El mismo margen debe usarse si cambia el tamaño del
            avatar; `mt-14` dejaba 16 px de hueco muerto. */}
        <div className="mt-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-slate-900">{merchant.name}</h2>
              <p className="truncate text-xs text-slate-500">@{merchant.slug}</p>
            </div>
            <Badge variant={isOpen ? 'success' : 'neutral'}>
              {isOpen ? 'Abierto' : 'Cerrado'}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
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
            {etaLabel !== null && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-brand-red/10 px-2 py-0.5 font-semibold text-brand-red"
                data-testid="store-eta"
              >
                <Clock className="h-3 w-3" aria-hidden="true" />
                {etaLabel}
              </span>
            )}
            {bcvRate > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                <DollarSign className="h-3 w-3" />
                Tasa BCV: Bs. {bcvRate.toFixed(2)} / USD
              </span>
            )}
          </div>
        </div>

        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {categories.length > 0 ? (
          <div className="mt-4">
            <CategoryFilter
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              variant="tabs"
              sticky
            />
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-4">
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
