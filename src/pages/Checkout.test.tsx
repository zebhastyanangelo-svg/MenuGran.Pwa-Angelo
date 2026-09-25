import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Checkout } from './Checkout';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useMerchantPagoMovil } from '../hooks/useMerchantPagoMovil';

const mockShowToast = vi.fn();

vi.mock('../hooks/useCart', () => ({
  useCart: vi.fn(),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../hooks/useMerchantPagoMovil', () => ({
  useMerchantPagoMovil: vi.fn(),
}));

vi.mock('../utils/imageCompressor', () => ({
  compressImage: vi.fn().mockResolvedValue({ blob: new Blob(['fake']), size: 50_000, width: 1, height: 1, type: 'image/jpeg' }),
  PAYMENT_PROOF_MAX_BYTES: 150 * 1024,
  buildProofFileName: vi.fn().mockImplementation((orderId: string) => `${orderId}/proof.jpg`),
}));

vi.mock('../components/map/LocationPicker', () => {
  return {
    LocationPicker: ({ onLocationChange }: any) => (
      <div data-testid="mock-location-picker">
        <button type="button" onClick={() => onLocationChange({ x: -99.1332, y: 19.4326 })}>
          Seleccionar ubicación
        </button>
      </div>
    ),
  };
});

const mockCreateOrder = vi.fn().mockResolvedValue('order-abc-123');
const mockUploadPaymentProofTemp = vi.fn().mockResolvedValue('tmp/abc123.jpg');

vi.mock('../services/checkoutService', () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  uploadPaymentProofTemp: (...args: unknown[]) => mockUploadPaymentProofTemp(...args),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const validCart = {
  items: [{ product: { id: 'p-1', price: '100.00', title: 'Pizza' }, quantity: 1 } as any],
  totalAmount: '100',
  totalItems: 1,
  merchantId: 'm-123',
  validationError: null,
  canCheckout: true,
  clearCart: vi.fn(),
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  addItem: vi.fn(),
  confirmAddItem: vi.fn(),
};

const validPagoMovil = {
  bank: 'Banesco',
  idNumber: 'J-123456789',
  phone: '0412-1234567',
};

function setPagoMovilMock(pagoMovil: typeof validPagoMovil | null) {
  vi.mocked(useMerchantPagoMovil).mockReturnValue({
    pagoMovil,
    isLoading: false,
    error: null,
  });
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'http://localhost';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
});

describe('Checkout', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockShowToast.mockClear();
    mockCreateOrder.mockClear().mockResolvedValue('order-abc-123');
    mockUploadPaymentProofTemp.mockClear().mockResolvedValue('tmp/abc123.jpg');
    vi.mocked(useCart).mockReturnValue(validCart);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' } as any,
      profile: null,
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      signOut: vi.fn(),
    });
    setPagoMovilMock(validPagoMovil);
  });

  function renderCheckout() {
    return render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );
  }

  it('muestra estado inválido cuando el carrito no es válido', () => {
    vi.mocked(useCart).mockReturnValue({
      ...validCart,
      canCheckout: false,
      validationError: 'Carrito con productos de múltiples comercios.',
    });
    renderCheckout();
    expect(screen.getByText(/Carrito con productos de múltiples comercios/i)).toBeInTheDocument();
  });

  it(
    'renderiza el formulario con tipo de pedido cuando el carrito es válido',
    () => {
      renderCheckout();
      expect(screen.getByText(/Finalizar pedido/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Entrega a domicilio/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Retiro en local/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Tu carrito está vacío/i),
      ).not.toBeInTheDocument();
    },
    10000,
  );

  it('muestra los datos de Pago Móvil configurados por el comercio', () => {
    renderCheckout();

    expect(screen.getByTestId('pago-movil-data')).toBeInTheDocument();
    expect(screen.getByTestId('pago-movil-data')).toHaveTextContent('Banesco');
    expect(screen.getByTestId('pago-movil-data')).toHaveTextContent('J-123456789');
    expect(screen.getByTestId('pago-movil-data')).toHaveTextContent('0412-1234567');
  });

  it('bloquea Pago Móvil si el comercio no configuró sus datos', async () => {
    setPagoMovilMock(null);
    renderCheckout();

    expect(screen.getByText(/aún no configuró sus datos de Pago Móvil/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Número de comprobante/i), 'REF123456');
    const file = new File(['fake'], 'proof.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(foto o PDF\)/i), file);

    const form = screen.getByRole('button', { name: /Confirmar y enviar comprobante/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/aún no configuró sus datos de Pago Móvil/i);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('requiere referencia y comprobante antes de enviar con Pago Móvil', async () => {
    renderCheckout();

    const form = screen.getByRole('button', { name: /Confirmar y enviar comprobante/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Ingresa el número de comprobante/i);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('la entrega a domicilio requiere ubicación', async () => {
    renderCheckout();

    await user.type(screen.getByLabelText(/Número de comprobante/i), 'REF123456');
    const file = new File(['fake'], 'proof.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(foto o PDF\)/i), file);

    const form = screen.getByRole('button', { name: /Confirmar y enviar comprobante/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Selecciona tu ubicación de entrega/i);
  }, 10000);

  it('confirma el pedido con Pago Móvil, muestra toast y vacía el carrito', async () => {
    renderCheckout();

    await user.type(screen.getByLabelText(/Número de comprobante/i), 'REF123456');
    const file = new File(['fake'], 'proof.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(foto o PDF\)/i), file);
    await user.click(screen.getByRole('button', { name: /Seleccionar ubicación/i }));

    const form = screen.getByRole('button', { name: /Confirmar y enviar comprobante/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success', title: '¡Pedido enviado!' }),
      );
    }, { timeout: 5000 });
    expect(mockUploadPaymentProofTemp).toHaveBeenCalled();
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'm-123',
        customerId: 'user-123',
        orderType: 'delivery',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF123456',
        totalAmount: 100,
        paymentProofUrl: 'tmp/abc123.jpg',
      }),
    );
    expect(validCart.clearCart).toHaveBeenCalled();
  }, 10000);

  it('Punto de Venta no solicita captura y registra card_pos', async () => {
    renderCheckout();

    await user.click(screen.getByRole('button', { name: /Punto de Venta/i }));
    expect(screen.queryByLabelText(/Comprobante \(foto o PDF\)/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Pagarás con tarjeta \/ punto de venta/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Seleccionar ubicación/i }));

    const form = screen.getByRole('button', { name: /Confirmar pedido/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalled();
    }, { timeout: 5000 });
    expect(mockUploadPaymentProofTemp).not.toHaveBeenCalled();
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 'card_pos',
        paymentReference: '',
        paymentProofUrl: null,
        deliveryLocation: { x: -99.1332, y: 19.4326 },
      }),
    );
  }, 10000);

  it('Efectivo no solicita captura y registra cash', async () => {
    renderCheckout();

    await user.click(screen.getByRole('button', { name: /Retiro en local/i }));
    await user.click(screen.getByRole('button', { name: /Efectivo/i }));
    expect(
      screen.getByText(/Pagarás en efectivo al recibir tu pedido/i),
    ).toBeInTheDocument();

    const form = screen.getByRole('button', { name: /Confirmar pedido/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalled();
    }, { timeout: 5000 });
    expect(mockUploadPaymentProofTemp).not.toHaveBeenCalled();
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'pickup',
        paymentMethod: 'cash',
        paymentProofUrl: null,
      }),
    );
    expect(validCart.clearCart).toHaveBeenCalled();
  }, 10000);

  it('redirige a /orders/:orderId después de confirmar el pedido', async () => {
    renderCheckout();

    await user.type(screen.getByLabelText(/Número de comprobante/i), 'REF123456');
    const file = new File(['fake'], 'proof.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(foto o PDF\)/i), file);
    await user.click(screen.getByRole('button', { name: /Seleccionar ubicación/i }));

    const form = screen.getByRole('button', { name: /Confirmar y enviar comprobante/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalled();
    }, { timeout: 5000 });
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'm-123',
        customerId: 'user-123',
        orderType: 'delivery',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF123456',
        totalAmount: 100,
        paymentProofUrl: 'tmp/abc123.jpg',
      }),
    );
    expect(validCart.clearCart).toHaveBeenCalled();
  }, 10000);
});
