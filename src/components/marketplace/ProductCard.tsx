import type { ProductRow } from '../../types/database';

export interface ProductCardProps {
  product: ProductRow;
  onSelect?: (product: ProductRow) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const numericPrice = parseFloat(product.price);
  const formattedPrice = isNaN(numericPrice)
    ? product.price
    : `$${numericPrice.toFixed(2)}`;

  const handleClick = () => {
    if (onSelect !== undefined) {
      onSelect(product);
    }
  };

  return (
    <div
      onClick={handleClick}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={`Ver producto ${product.title}`}
      className="flex gap-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-gray-900">{product.title}</h4>
          {!product.is_available ? (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
              Agotado
            </span>
          ) : null}
        </div>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
            {product.description}
          </p>
        ) : null}
        <p className="mt-2 text-sm font-bold text-indigo-600">
          {formattedPrice}
        </p>
      </div>

      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
            Sin foto
          </div>
        )}
      </div>
    </div>
  );
}
