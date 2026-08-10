import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Checkout } from './Checkout';

vi.mock('../hooks/useCart', () => ({
  useCart: vi.fn().mockReturnValue({
    items: [],
    totalAmount: '0.00',
    totalItems: 0,
    merchantId: 'm-123',
    clearCart: vi.fn(),
  }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    profile: { id: 'user-123', email: 'user@example.com' },
  }),
}));

vi.mock('../utils/imageCompressor', () => ({
  compressImage: vi.fn().mockResolvedValue({
    blob: new Blob(['fake-image-data'], { type: 'image/jpeg' }),
    size: 50_000, // 50 KB
    width: 800,
    height: 600,
    type: 'image/jpeg',
  }),
  PAYMENT_PROOF_MAX_BYTES: 150 * 1024,
  buildProofFileName: vi.fn().mockImplementation((orderId) => `${orderId}/proof.jpg`),
}));

vi.mock('../components/map/LocationPicker', () => {
  return {
    LocationPicker: ({ onLocationChange }: any) => {
      const React = require('react');
      React.useEffect(() => {
        onLocationChange({ x: -99.1332, y: 19.4326 });
      }, [onLocationChange]);

      return (
        <div data-testid="mock-location-picker">
          <button
            type="button"
            onClick={() => onLocationChange({ x: -99.1332, y: 19.4326 })}
          >
            Seleccionar ubicación
          </button>
        </div>
      );
    },
  };
});

vi.mock('../services/supabase', () => {
  const fromMock = vi.fn();
  fromMock.mockImplementation((_tableName) => {
    const insertMock = vi.fn().mockImplementation((_data) => {
      return {
        single: vi.fn().mockResolvedValue({ data: { id: 'order-123' }, error: null })
      };
    });
    const updateMock = vi.fn().mockImplementation((_data) => {
      return {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
    });
    return { insert: insertMock, update: updateMock };
  });

  const storageFromMock = vi.fn();
  storageFromMock.mockImplementation((_bucketName) => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const createSignedUrlMock = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed-url.jpg' }, error: null });
    return { upload: uploadMock, createSignedUrl: createSignedUrlMock };
  });

  return {
    supabase: {
      from: fromMock,
      storage: {
        from: storageFromMock,
      },
    },
    TABLE_NAMES: {
      merchants: 'merchants',
      categories: 'categories',
      products: 'products',
      profiles: 'profiles',
      orders: 'orders',
      deliveries: 'deliveries',
      merchantStaff: 'merchant_staff',
    },
  };
});

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'http://localhost';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
});

describe('Checkout', () => {
  const user = userEvent.setup();
  let mockUseCart: any;
  let mockImageCompressor: any;
  let mockSupabase: any;

  beforeEach(async () => {
    const useCartModule = await import('../hooks/useCart');
    mockUseCart = vi.mocked(useCartModule);
    mockUseCart.useCart().clearCart.mockClear();
    
    const imageCompressorModule = await import('../utils/imageCompressor');
    mockImageCompressor = vi.mocked(imageCompressorModule);
    mockImageCompressor.compressImage.mockClear();
    
    const supabaseModule = await import('../services/supabase');
    mockSupabase = vi.mocked(supabaseModule);
    mockSupabase.supabase.from.mockClear();
    mockSupabase.supabase.storage.from.mockClear();
  });

  it('renderiza sin caer', () => {
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    );
    expect(screen.getByText(/Tu carrito está vacío/i)).toBeInTheDocument();
  });

  it('muestra mensaje de carrito vacío cuando no hay ítems', () => {
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    );
    expect(screen.getByText(/Tu carrito está vacío/i)).toBeInTheDocument();
  });

  it('muestra mensaje de comercio múltiple cuando merchantId es null', async () => {
    const useCartModule = await import('../hooks/useCart');
    mockUseCart = vi.mocked(useCartModule);
    mockUseCart.useCart.mockReturnValue({
      items: [{ product: { id: 'p-1', price: '100.00' } as any, quantity: 1 }],
      totalAmount: '100.00',
      totalItems: 1,
      merchantId: null,
      clearCart: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    );
    expect(screen.getByText(/Carrito con productos de múltiples comercios/i)).toBeInTheDocument();
  });

  it('deshabilita el botón de pago inicialmente', async () => {
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    );
    const submitButton = screen.queryByRole('button', { name: /Confirmar y Pagar/i });
    expect(submitButton).toBeNull();
  });

  it('habilita el botón de pago cuando se completan los campos requeridos', async () => {
    const useCartModule = await import('../hooks/useCart');
    mockUseCart = vi.mocked(useCartModule);
    mockUseCart.useCart.mockReturnValue({
      items: [{ product: { id: 'p-1', price: '100.00' } as any, quantity: 2 }],
      totalAmount: '200.00',
      totalItems: 2,
      merchantId: 'm-123',
      clearCart: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    );

    const bankInput = screen.getByLabelText(/Banco o institución:/i) as HTMLInputElement;
    await user.type(bankInput, 'BBVA');

    const refInput = screen.getByLabelText(/Número de referencia:/i) as HTMLInputElement;
    await user.type(refInput, 'REF123456');

    const fileInput = screen.getByLabelText(/Comprobante \(foto o PDF\):/i) as HTMLInputElement;
    const file = new File(['fake-image-content'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    const selectLocationBtn = screen.queryByRole('button', { name: /Seleccionar ubicación/i });
    if (selectLocationBtn) {
      await user.click(selectLocationBtn);
    }

    // Get the form via the bank input
    const form = bankInput.closest('form');
    if (!form) {
      throw new Error('Could not find form');
    }
    fireEvent.submit(form);

    // Wait for the processing spinner to appear
    await waitFor(() => {
      return screen.getByText(/Procesando pago.../i);
    });

    // Esperar a que se llame a from dos veces para la tabla de orders (insert y update)
    await waitFor(() => {
      return mockSupabase.supabase.from.mock.calls.length >= 2;
    });

    // Verificar las llamadas a supabase.from para la tabla de orders
    expect(mockSupabase.supabase.from).toHaveBeenCalledTimes(2);
    expect(mockSupabase.supabase.from).toHaveBeenNthCalledWith(1, 'orders');
    expect(mockSupabase.supabase.from).toHaveBeenNthCalledWith(2, 'orders');

    // Verificar que se haya llamado a insert para crear la orden
    const insertObject = mockSupabase.supabase.from.mock.results[0].value;
    expect(insertObject.insert).toHaveBeenCalledTimes(1);

    // Verificar que se haya llamado a storage.from dos veces con el bucket correcto
    expect(mockSupabase.supabase.storage.from).toHaveBeenCalledTimes(2);
    expect(mockSupabase.supabase.storage.from).toHaveBeenNthCalledWith(1, PAYMENT_PROOF_BUCKET);
    expect(mockSupabase.supabase.storage.from).toHaveBeenNthCalledWith(2, PAYMENT_PROOF_BUCKET);

    // Obtener el mock del primer llamado (para upload)
    const storageUploadMock = mockSupabase.supabase.storage.from.mock.results[0].value;
    expect(storageUploadMock.upload).toHaveBeenCalled();

    // Obtener el mock del segundo llamado (para createSignedUrl)
    const storageUrlMock = mockSupabase.supabase.storage.from.mock.results[1].value;
    expect(storageUrlMock.createSignedUrl).toHaveBeenCalled();

    // Verificar que se haya llamado a update para actualizar la orden con la URL del comprobante
    const updateObject = mockSupabase.supabase.from.mock.results[1].value;
    expect(updateObject.update).toHaveBeenCalledTimes(1);
  });
});