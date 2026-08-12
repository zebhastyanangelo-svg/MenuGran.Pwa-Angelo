import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Checkout } from './Checkout';
import { useCart } from '../hooks/useCart';

const mockShowToast = vi.fn();

vi.mock('../hooks/useCart', () => ({
  useCart: vi.fn(),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
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
};

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'http://localhost';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
});

describe('Checkout', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockShowToast.mockClear();
    vi.mocked(useCart).mockReturnValue(validCart);
  });

  it('muestra estado inválido cuando el carrito no es válido', () => {
    vi.mocked(useCart).mockReturnValue({
      ...validCart,
      canCheckout: false,
      validationError: 'Carrito con productos de múltiples comercios.',
    });
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Carrito con productos de múltiples comercios/i)).toBeInTheDocument();
  });

  it('renderiza el formulario con tipo de pedido cuando el carrito es válido', () => {
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Finalizar pedido/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrega a domicilio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retiro en local/i })).toBeInTheDocument();
    expect(screen.queryByText(/Tu carrito está vacío/i)).not.toBeInTheDocument();
  });

  it('requiere banco, referencia y comprobante antes de enviar', async () => {
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    const form = screen.getByRole('button', { name: /Confirmar y enviar comprobante/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Selecciona el banco de destino/i);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('la entrega a domicilio requiere ubicación', async () => {
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText(/Banco de destino/i), 'banco_pichincha');
    await user.type(screen.getByLabelText(/Número de comprobante/i), 'REF123456');
    const file = new File(['fake'], 'proof.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(foto o PDF\)/i), file);

    const form = screen.getByRole('button', { name: /Confirmar y enviar comprobante/i }).closest('form');
    if (!form) throw new Error('No se encontró el formulario');
    fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Selecciona tu ubicación de entrega/i);
  });

  it('confirma el pedido, muestra toast y vacía el carrito', async () => {
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText(/Banco de destino/i), 'banco_pichincha');
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
    });
    expect(validCart.clearCart).toHaveBeenCalled();
  });
});
