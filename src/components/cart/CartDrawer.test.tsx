import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider } from '../../context/CartContext';
import { MemoryRouter } from 'react-router-dom';
import { CartDrawer } from './CartDrawer';

const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

vi.stubGlobal('localStorage', localStorageMock);

describe('CartDrawer', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockReset();
  });

  it('no renderiza cuando está cerrado y carrito vacío', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <CartDrawer isOpen={false} onClose={vi.fn()} />
        </MemoryRouter>
      </CartProvider>,
    );

    expect(screen.queryByLabelText('Carrito de compras')).not.toBeInTheDocument();
  });

  it('muestra mensaje de carrito vacío', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <CartDrawer isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </CartProvider>,
    );

    expect(
      screen.getByText(/Tu carrito está vacío/i),
    ).toBeInTheDocument();
  });

  it('muestra el total en estado vacío', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <CartDrawer isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </CartProvider>,
    );

    expect(screen.getByText('Subtotal (0 ítems):')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('llama onClose al pulsar botón cerrar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CartProvider>
        <MemoryRouter>
          <CartDrawer isOpen={true} onClose={onClose} />
        </MemoryRouter>
      </CartProvider>,
    );

    const closeButton = screen.getByRole('button', { name: 'Cerrar' });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('muestra botón de pago deshabilitado cuando carrito vacío', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <CartDrawer isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </CartProvider>,
    );

    const payButton = screen.getByRole('button', { name: 'Proceder al pago' });
    expect(payButton).toBeDisabled();
  });
});
