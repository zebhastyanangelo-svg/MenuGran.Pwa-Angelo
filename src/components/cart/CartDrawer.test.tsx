import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider } from '../../context/CartContext';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CartDrawer } from './CartDrawer';

const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

vi.stubGlobal('localStorage', localStorageMock);

/** Perfil del hook useAuth, mutable por test. */
let mockProfile: {
  phone?: string | null;
  ci?: string | null;
} | null = null;

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

function renderDrawerWithRoutes(props: { isOpen: boolean; onClose: () => void }) {
  return render(
    <CartProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={<CartDrawer {...props} />}
          />
          <Route
            path="/checkout"
            element={<div data-testid="checkout-route">checkout</div>}
          />
          <Route
            path="/profile"
            element={<div data-testid="profile-route">profile</div>}
          />
        </Routes>
      </MemoryRouter>
    </CartProvider>,
  );
}

/** Ítem válido que habilita el botón de pago del carrito. */
const SEEDED_CART_ITEM = [
  {
    product: {
      id: 'p-1',
      title: 'Arepa',
      price: '5.00',
      merchant_id: 'm-1',
      image_url: null,
    },
    quantity: 1,
    notes: undefined,
  },
];

/** Pre-carga el carrito en el localStorage stubbeado. */
function seedCartItem() {
  localStorageMock.getItem.mockImplementation((key: string) =>
    key === 'menugram_cart' ? JSON.stringify(SEEDED_CART_ITEM) : null,
  );
}

describe('CartDrawer', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockReset();
    mockProfile = null;
  });

  it('no renderiza cuando está cerrado y carrito vacío', () => {
    renderDrawerWithRoutes({ isOpen: false, onClose: vi.fn() });

    expect(screen.queryByLabelText('Carrito de compras')).not.toBeInTheDocument();
  });

  it('muestra mensaje de carrito vacío', () => {
    renderDrawerWithRoutes({ isOpen: true, onClose: vi.fn() });

    expect(
      screen.getByText(/Tu carrito está vacío/i),
    ).toBeInTheDocument();
  });

  it('muestra el total en estado vacío', () => {
    renderDrawerWithRoutes({ isOpen: true, onClose: vi.fn() });

    expect(screen.getByText('Subtotal (0 ítems):')).toBeInTheDocument();
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0);
  });

  it('desglose subtotal, tarifa y cupón con iconos, sin inventar el envío', () => {
    renderDrawerWithRoutes({ isOpen: true, onClose: vi.fn() });

    // El envío no se lista en el carrito: depende del comercio y del tipo de
    // despacho, que aún no se han elegido. El texto sí dice que se calcula
    // después, para que el total no se lea como cerrado.
    expect(screen.queryByText('Envío')).not.toBeInTheDocument();
    expect(screen.getByText(/Se calcula en el checkout/i)).toBeInTheDocument();
    expect(screen.getByText('Tarifa de servicio')).toBeInTheDocument();
    expect(screen.getByText('Cupón')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('llama onClose al pulsar botón cerrar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderDrawerWithRoutes({ isOpen: true, onClose });

    const closeButton = screen.getByRole('button', { name: 'Cerrar' });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('muestra botón de pago deshabilitado cuando carrito vacío', () => {
    renderDrawerWithRoutes({ isOpen: true, onClose: vi.fn() });

    const payButton = screen.getByRole('button', { name: 'Proceder al pago' });
    expect(payButton).toBeDisabled();
  });
});

describe('CartDrawer con perfil incompleto', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    mockProfile = null;
  });

  it('bloquea el pedido y muestra el modal con los campos pendientes', async () => {
    mockProfile = { phone: '0412-1234567', ci: null };
    const user = userEvent.setup();

    // El carrito se carga al montar el provider: se siembra antes de render.
    seedCartItem();
    renderDrawerWithRoutes({ isOpen: true, onClose: vi.fn() });

    const payButton = screen.getByRole('button', { name: 'Proceder al pago' });
    await user.click(payButton);

    expect(screen.getByText('Completa tu perfil para pedir')).toBeInTheDocument();
    expect(screen.getByText(/Falta: Cédula de Identidad/i)).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-route')).not.toBeInTheDocument();
  });

  it('redirige al perfil desde el botón del modal', async () => {
    mockProfile = { phone: null, ci: 'V12345678' };
    const user = userEvent.setup();

    seedCartItem();
    renderDrawerWithRoutes({ isOpen: true, onClose: vi.fn() });

    const payButton = screen.getByRole('button', { name: 'Proceder al pago' });
    await user.click(payButton);
    await user.click(screen.getByTestId('go-to-profile-button'));

    expect(screen.getByTestId('profile-route')).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-route')).not.toBeInTheDocument();
  });
});
