// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { OrderCard } from '@/components/ui/order-card/OrderCard';

vi.mock('@/components/ui/order-time-indicator/OrderTimeIndicator', () => ({
  OrderTimeIndicator: () => <div data-testid="time-indicator" />,
}));

describe('OrderCard', () => {
  it('renders without crashing given a fully-typed order', () => {
    const order = {
      id: 'abc123def456',
      status: 'PREPARING',
      items: [
        { id: 'i1', name: 'Hamburguesa', quantity: 2, price: 12500 },
      ],
      totalPrice: 25000,
      estimatedMinutes: 30,
      elapsedMinutes: 10,
    };

    const { container } = render(<OrderCard order={order} />);
    expect(container.textContent).toContain('Pedido');
    expect(container.textContent).toContain('Total:');
    expect(container.textContent).toContain('$25000.00');
  });

  it('renders pluralised item count correctly', () => {
    const order = {
      id: 'x1',
      status: 'PENDING',
      items: [
        { id: 'a', name: 'A', quantity: 1, price: 1000 },
        { id: 'b', name: 'B', quantity: 1, price: 2000 },
      ],
      totalPrice: 3000,
    };

    const { container } = render(<OrderCard order={order} />);
    expect(container.textContent).toContain('2 items');
  });
});
