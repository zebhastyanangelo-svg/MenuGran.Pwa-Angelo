import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MerchantDishesPage } from './MerchantDishesPage';

// Mock de los hooks y del componente pesado para aislar la página
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../hooks/useMerchantDashboard', () => ({
  useMerchantDashboard: () => ({
    merchantIds: ['merchant-123'],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../components/merchant/ProductManagement', () => ({
  ProductManagement: ({ merchantId }: { merchantId: string }) => (
    <div data-testid="product-management">{`MERCHANT:${merchantId}`}</div>
  ),
}));

describe('MerchantDishesPage', () => {
  it('muestra el encabezado de gestión del menú', () => {
    render(<MerchantDishesPage />);

    expect(screen.getByRole('heading', { name: /gestión del menú/i })).toBeInTheDocument();
  });

  it('pasa el merchantId resuelto al panel de productos', async () => {
    render(<MerchantDishesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('product-management')).toHaveTextContent(
        'MERCHANT:merchant-123'
      );
    });
  });
});
