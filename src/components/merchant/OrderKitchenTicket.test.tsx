import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { OrderItem } from '../../types/database';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import {
  OrderKitchenTicket,
  getKitchenItemLabel,
  hasCustomizedItems,
  isKitchenItemModified,
} from './OrderKitchenTicket';

function buildOrder(items: readonly OrderItem[]): OrderWithCustomer {
  return {
    id: 'order-1',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: null,
    type: 'delivery',
    status: 'confirmed',
    payment_method: 'pago_movil',
    payment_reference: null,
    payment_proof_url: null,
    total_amount: '150.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    delivery_address: null,
    latitude: null,
    longitude: null,
    items,
    created_at: new Date().toISOString(),
  };
}

describe('getKitchenItemLabel', () => {
  it('usa el snapshot del nombre cuando existe', () => {
    expect(getKitchenItemLabel({ product_id: 'p-1', quantity: 1, unit_price: 10, title: 'Pizza' })).toBe(
      'Pizza',
    );
  });

  it('cae al identificador cuando el pedido no tiene snapshot', () => {
    expect(getKitchenItemLabel({ product_id: 'abcdefgh1234', quantity: 1, unit_price: 10 })).toBe(
      'Producto #abcdefgh',
    );
    expect(getKitchenItemLabel({ product_id: 'p-1', quantity: 1, unit_price: 10, title: '  ' })).toBe(
      'Producto #p-1',
    );
  });
});

describe('isKitchenItemModified / hasCustomizedItems', () => {
  it('detecta ingredientes tachados y notas del cliente', () => {
    expect(
      isKitchenItemModified({
        product_id: 'p-1',
        quantity: 1,
        unit_price: 10,
        excluded_ingredients: ['Cebolla'],
      }),
    ).toBe(true);
    expect(
      isKitchenItemModified({ product_id: 'p-1', quantity: 1, unit_price: 10, notes: 'Extra queso' }),
    ).toBe(true);
    expect(isKitchenItemModified({ product_id: 'p-1', quantity: 1, unit_price: 10 })).toBe(false);
  });

  it('marca el pedido completo cuando al menos una línea está modificada', () => {
    const order = buildOrder([
      { product_id: 'p-1', quantity: 1, unit_price: 10 },
      { product_id: 'p-2', quantity: 1, unit_price: 10, excluded_ingredients: ['Jamón'] },
    ]);
    expect(hasCustomizedItems(order)).toBe(true);
    expect(hasCustomizedItems(buildOrder([]))).toBe(false);
  });
});

describe('OrderKitchenTicket', () => {
  it('no renderiza nada cuando el pedido no tiene ítems', () => {
    const { container } = render(<OrderKitchenTicket order={buildOrder([])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lista los ítems con su cantidad', () => {
    render(
      <OrderKitchenTicket
        order={buildOrder([
          { product_id: 'p-1', quantity: 2, unit_price: 25, title: 'Pizza Pepperoni' },
          { product_id: 'p-2', quantity: 1, unit_price: 5, title: 'Refresco' },
        ])}
      />,
    );

    expect(screen.getByTestId('order-items-list')).toBeInTheDocument();
    expect(screen.getByText('2 × Pizza Pepperoni')).toBeInTheDocument();
    expect(screen.getByText('1 × Refresco')).toBeInTheDocument();
  });

  it('muestra los ingredientes tachados y la nota del cliente', () => {
    render(
      <OrderKitchenTicket
        order={buildOrder([
          {
            product_id: 'p-1',
            quantity: 1,
            unit_price: 25,
            title: 'Pizza',
            excluded_ingredients: ['Cebolla', 'Jamón'],
            notes: 'Agregar cebolla morada',
          },
        ])}
      />,
    );

    expect(screen.getByText(/^Sin:/)).toHaveTextContent('Sin: Cebolla, Jamón');
    expect(screen.getByText('Cebolla, Jamón')).toHaveClass('line-through');
    expect(screen.getByText(/Agregar cebolla morada/)).toBeInTheDocument();
  });

  it('etiqueta el pedido como "Modificado por Cliente"', () => {
    render(
      <OrderKitchenTicket
        order={buildOrder([
          { product_id: 'p-1', quantity: 1, unit_price: 25, title: 'Pizza', excluded_ingredients: ['Cebolla'] },
        ])}
      />,
    );

    expect(screen.getByTestId('customized-order-badge')).toHaveTextContent('Modificado por Cliente');
  });

  it('no etiqueta el pedido cuando la comanda es estándar', () => {
    render(
      <OrderKitchenTicket
        order={buildOrder([{ product_id: 'p-1', quantity: 1, unit_price: 25, title: 'Pizza' }])}
      />,
    );

    expect(screen.queryByTestId('customized-order-badge')).not.toBeInTheDocument();
  });
});
