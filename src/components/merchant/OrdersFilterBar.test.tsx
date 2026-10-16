import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import { ORDER_BOARD_TABS, type OrderBoardTabKey } from '../../utils/orderBoard';
import { OrdersFilterBar } from './OrdersFilterBar';

const COUNTS: Record<OrderBoardTabKey, number> = {
  all: 12,
  payment_pending: 2,
  kitchen: 3,
  dispatch: 4,
  delivered: 2,
  cancelled: 1,
};

function renderBar(overrides: Partial<React.ComponentProps<typeof OrdersFilterBar>> = {}) {
  const onTabChange = vi.fn();
  const onPeriodChange = vi.fn();
  const onPaymentMethodChange = vi.fn();
  const onQueryChange = vi.fn();
  render(
    <OrdersFilterBar
      counts={COUNTS}
      activeTab="all"
      onTabChange={onTabChange}
      period="today"
      onPeriodChange={onPeriodChange}
      paymentMethod="all"
      onPaymentMethodChange={onPaymentMethodChange}
      availablePaymentMethods={['pago_movil', 'cash']}
      query=""
      onQueryChange={onQueryChange}
      resultCount={12}
      {...overrides}
    />,
  );
  return { onTabChange, onPeriodChange, onPaymentMethodChange, onQueryChange };
}

describe('OrdersFilterBar', () => {
  it('renderiza una pestaña por estado con su contador', () => {
    renderBar();

    for (const tab of ORDER_BOARD_TABS) {
      expect(screen.getByTestId(`tab-${tab.key}`)).toHaveTextContent(tab.label);
    }
    expect(screen.getByTestId('tab-kitchen')).toHaveTextContent('3');
    expect(screen.getByTestId('tab-all')).toHaveTextContent('12');
  });

  it('cambia de pestaña al pulsar', async () => {
    const { onTabChange } = renderBar();

    await userEvent.click(screen.getByTestId('tab-dispatch'));

    expect(onTabChange).toHaveBeenCalledWith('dispatch');
  });

  it('resalta la pestaña activa con el rojo de marca', () => {
    renderBar({ activeTab: 'dispatch' });

    expect(screen.getByTestId('tab-dispatch')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tab-dispatch').className).toContain('bg-brand-red');
    expect(screen.getByTestId('tab-all').className).not.toContain('bg-brand-red');
  });

  it('filtra por período', async () => {
    const { onPeriodChange } = renderBar();

    await userEvent.selectOptions(screen.getByLabelText('Fecha'), 'last_7_days');

    expect(onPeriodChange).toHaveBeenCalledWith('last_7_days');
  });

  it('filtra por método de pago usando solo los métodos presentes', async () => {
    const { onPaymentMethodChange } = renderBar();

    const select = screen.getByLabelText('Método de pago');
    expect(select).toHaveTextContent('Todos');
    expect(select).toHaveTextContent('Pago Móvil');
    expect(select).toHaveTextContent('Efectivo');
    expect(select).not.toHaveTextContent('Zelle');

    await userEvent.selectOptions(select, 'cash');

    expect(onPaymentMethodChange).toHaveBeenCalledWith('cash');
  });

  it('propaga la búsqueda inteligente', async () => {
    const onQueryChange = vi.fn();
    function StatefulSearch() {
      const [query, setQuery] = useState('');
      return (
        <OrdersFilterBar
          counts={COUNTS}
          activeTab="all"
          onTabChange={vi.fn()}
          period="today"
          onPeriodChange={vi.fn()}
          paymentMethod="all"
          onPaymentMethodChange={vi.fn()}
          availablePaymentMethods={['pago_movil', 'cash']}
          query={query}
          onQueryChange={(value) => {
            onQueryChange(value);
            setQuery(value);
          }}
          resultCount={1}
        />
      );
    }
    render(<StatefulSearch />);

    await userEvent.type(screen.getByLabelText('Buscar pedido o cliente'), '845F');

    expect(onQueryChange).toHaveBeenLastCalledWith('845F');
    expect(screen.getByLabelText('Buscar pedido o cliente')).toHaveValue('845F');
  });

  it('anuncia cuántos pedidos arrojó la combinación de filtros', () => {
    renderBar({ resultCount: 1 });

    expect(screen.getByTestId('board-result-count')).toHaveTextContent('1 pedido');
  });
});
