import { useState } from 'react';
import type { ProductRow } from '../../types/database';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/format';

export interface ProductDetailModalProps {
  product: ProductRow | null;
  categoryName?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: ProductRow, quantity: number) => void;
}

function formatPrice(price: string): string {
  const numeric = parseFloat(price);
  if (isNaN(numeric)) return price;
  return formatCurrency(numeric);
}

function ProductDetailBody({
  product,
  categoryName,
  onClose,
  onAddToCart,
}: {
  product: ProductRow;
  categoryName?: string;
  onClose: () => void;
  onAddToCart: (product: ProductRow, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (value: string) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setQuantity(1);
      return;
    }
    setQuantity(parsed);
  };

  const handleAdd = () => {
    onAddToCart(product, quantity);
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="h-40 w-full overflow-hidden rounded-lg bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            Sin foto
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {categoryName ? <Badge variant="primary">{categoryName}</Badge> : null}
        <Badge variant="success">{formatPrice(product.price)}</Badge>
        {!product.is_available ? <Badge variant="danger">Agotado</Badge> : null}
      </div>

      {product.description ? (
        <p className="text-sm text-gray-600">{product.description}</p>
      ) : null}

      <div className="w-32">
        <Input
          label="Cantidad"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          aria-label="Cantidad del producto"
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        disabled={!product.is_available}
        onClick={handleAdd}
      >
        {product.is_available ? 'Agregar al carrito' : 'No disponible'}
      </Button>
    </div>
  );
}

export function ProductDetailModal({
  product,
  categoryName,
  isOpen,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product?.title ?? 'Detalle del producto'}
    >
      {product === null ? null : (
        <ProductDetailBody
          key={product.id}
          product={product}
          categoryName={categoryName}
          onClose={onClose}
          onAddToCart={onAddToCart}
        />
      )}
    </Modal>
  );
}
