import type { ProductRow } from '../../types/database';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency } from '../../utils/format';

export interface ProductCardProps {
  product: ProductRow;
  categoryName?: string;
  onSelect?: (product: ProductRow) => void;
}

function formatPrice(price: string): string {
  const numeric = parseFloat(price);
  if (isNaN(numeric)) return price;
  return formatCurrency(numeric);
}

export function ProductCard({ product, categoryName, onSelect }: ProductCardProps) {
  const interactive = onSelect !== undefined;

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
      className={`flex cursor-pointer gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-red ${
        interactive ? '' : 'cursor-default'
      }`}
    >
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-bold text-gray-900">{product.title}</h4>
          {categoryName ? <Badge variant="primary">{categoryName}</Badge> : null}
          {!product.is_available ? <Badge variant="danger">Agotado</Badge> : null}
        </div>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{product.description}</p>
        ) : null}
        <Badge variant="success" className="mt-2">
          {formatPrice(product.price)}
        </Badge>
      </div>

      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
            Sin foto
          </div>
        )}
      </div>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="flex gap-4 p-3" aria-hidden="true">
      <div className="flex-1">
        <Skeleton variant="text" className="w-2/3" />
        <Skeleton variant="text" className="mt-2 w-full" />
        <Skeleton variant="text" className="mt-2 w-1/3" />
      </div>
      <Skeleton variant="rectangular" className="h-20 w-20 flex-shrink-0" />
    </Card>
  );
}
