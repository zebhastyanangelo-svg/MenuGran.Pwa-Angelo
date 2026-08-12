import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ProductRow } from '../../types/database';
import { ProductDetailModal } from './ProductDetailModal';

function buildProduct(id: string, title: string, price: string, isAvailable = true): ProductRow {
  return {
    id,
    merchant_id: 'merchant-1',
    category_id: 'category-1',
    title,
    description: `Descripción de ${title}`,
    price,
    image_url: null,
    is_available: isAvailable,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('ProductDetailModal', () => {
  it('no renderiza nada cuando está cerrado', () => {
    render(
      <ProductDetailModal
        product={null}
        isOpen={false}
        onClose={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el título, precio y descripción del producto', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    render(
      <ProductDetailModal
        product={product}
        categoryName="Platillos"
        isOpen
        onClose={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText('Descripción de Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText('Platillos')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('agrega al carrito con la cantidad indicada', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50');
    const onAddToCart = vi.fn();
    render(
      <ProductDetailModal
        product={product}
        isOpen
        onClose={vi.fn()}
        onAddToCart={onAddToCart}
      />,
    );

    const quantityInput = screen.getByLabelText(/Cantidad/i);
    fireEvent.change(quantityInput, { target: { value: '3' } });

    fireEvent.click(screen.getByRole('button', { name: /Agregar al carrito/i }));
    expect(onAddToCart).toHaveBeenCalledWith(product, 3);
  });

  it('deshabilita la adición cuando el producto no está disponible', () => {
    const product = buildProduct('p1', 'Hamburguesa', '12.50', false);
    render(
      <ProductDetailModal
        product={product}
        isOpen
        onClose={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /No disponible/i })).toBeDisabled();
  });
});
