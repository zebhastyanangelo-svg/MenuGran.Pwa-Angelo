import { Plus } from 'lucide-react';
import { useBCVRate } from '../../hooks/useExchangeRate';
import type { ProductRow } from '../../types/database';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { formatUSD, formatVES } from '../../utils/format';
import { resolveProductBadges } from '../../utils/promos';

export interface ProductCardProps {
  product: ProductRow;
  categoryName?: string;
  onSelect?: (product: ProductRow) => void;
}

function formatPrice(price: string): string {
  const numeric = parseFloat(price);
  if (isNaN(numeric)) return price;
  return formatUSD(numeric);
}

/** Distintivos y descuento que el comercio configuró para el plato. */
function ProductBadges({ product }: { product: ProductRow }) {
  const badges = resolveProductBadges(product);
  if (badges.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="product-badges">
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${
            badge.kind === 'discount'
              ? 'bg-brand-red text-white'
              : 'bg-brand-amber text-slate-900'
          }`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export function ProductCard({ product, categoryName, onSelect }: ProductCardProps) {
  const interactive = onSelect !== undefined;
  const bcvRate = useBCVRate();
  const priceUSD = parseFloat(product.price);
  const priceVES = bcvRate > 0 && !isNaN(priceUSD) ? priceUSD * bcvRate : 0;
  const showVES = bcvRate > 0 && priceVES > 0;

  return (
    <Card
      onClick={interactive ? () => onSelect(product) : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`Ver producto ${product.title}`}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(product);
              }
            }
          : undefined
      }
      className={`group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red ${
        interactive ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="min-w-0 flex-1">
        <h4 className="text-base font-semibold leading-snug text-slate-900">
          {product.title}
        </h4>

        <ProductBadges product={product} />

        {(categoryName !== undefined || !product.is_available) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {categoryName ? <Badge variant="primary">{categoryName}</Badge> : null}
            {!product.is_available ? <Badge variant="danger">Agotado</Badge> : null}
          </div>
        )}

        {product.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {product.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-base font-bold leading-none text-slate-900">
              {formatPrice(product.price)}
            </span>
            {showVES ? (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium leading-none text-emerald-700">
                {formatVES(priceVES)}
              </span>
            ) : null}
          </div>

          {interactive ? (
            <button
              type="button"
              onClick={(event) => {
                // La tarjeta completa ya es un control activable; sin stopPropagation
                // este clic dispararía onSelect dos veces.
                event.stopPropagation();
                onSelect(product);
              }}
              aria-label={`Agregar ${product.title} al carrito`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-red px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Agregar
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/70"
        aria-hidden="true"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            Sin foto
          </div>
        )}
      </div>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="flex items-start gap-4 p-4" aria-hidden="true">
      <div className="min-w-0 flex-1">
        <Skeleton variant="text" className="w-2/3" />
        <Skeleton variant="text" className="mt-3 w-full" />
        <Skeleton variant="text" className="mt-3 w-1/3" />
      </div>
      <Skeleton variant="rectangular" className="h-20 w-20 flex-shrink-0 rounded-xl" />
    </Card>
  );
}