import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();

vi.mock('./supabase', () => ({
  TABLE_NAMES: {
    profiles: 'profiles',
    merchants: 'merchants',
    merchantStaff: 'merchant_staff',
    categories: 'categories',
    products: 'products',
    orders: 'orders',
    deliveries: 'deliveries',
    orderRatings: 'order_ratings',
    userPushSubscriptions: 'user_push_subscriptions',
  },
  supabase: {
    storage: {
      from: vi.fn(() => ({ upload: mockUpload })),
    },
    from: vi.fn(),
  },
}));

import {
  createOrder,
  isNetworkUploadError,
  uploadPaymentProof,
  uploadPaymentProofTemp,
} from './checkoutService';
import { supabase } from './supabase';

const networkFailure = () =>
  Object.assign(new TypeError('Failed to fetch'), {});

beforeEach(() => {
  mockUpload.mockReset();
});

describe('isNetworkUploadError', () => {
  it('reconoce los fallos de red de fetch en distintos navegadores', () => {
    expect(isNetworkUploadError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkUploadError(new Error('Load failed'))).toBe(true);
    expect(isNetworkUploadError(new Error('NetworkError when attempting to fetch resource.'))).toBe(
      true,
    );
  });

  it('no confunde errores del servidor con fallos de red', () => {
    expect(isNetworkUploadError(new Error('new row violates row-level security policy'))).toBe(
      false,
    );
    expect(isNetworkUploadError(new Error('Bucket not found'))).toBe(false);
    expect(isNetworkUploadError('cualquier cosa')).toBe(false);
  });
});

describe('uploadPaymentProofTemp', () => {
  it('reintenta la subida cuando falla la red y completa la transacción', async () => {
    mockUpload
      .mockRejectedValueOnce(networkFailure())
      .mockRejectedValueOnce(networkFailure())
      .mockResolvedValueOnce({ data: { path: 'tmp/ok.jpg' }, error: null });

    const path = await uploadPaymentProofTemp(new Blob(['proof'], { type: 'image/jpeg' }));

    expect(mockUpload).toHaveBeenCalledTimes(3);
    expect(path).toMatch(/^tmp\/.+\.jpg$/);
  });

  it('no reintenta errores del servidor (RLS, permisos)', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: new Error('new row violates row-level security policy'),
    });

    await expect(
      uploadPaymentProofTemp(new Blob(['proof'], { type: 'image/jpeg' })),
    ).rejects.toThrow(/row-level security/);
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('rinde el error de red después de agotar los reintentos', async () => {
    mockUpload.mockRejectedValue(networkFailure());

    await expect(
      uploadPaymentProofTemp(new Blob(['proof'], { type: 'image/jpeg' })),
    ).rejects.toThrow('Failed to fetch');
    expect(mockUpload).toHaveBeenCalledTimes(3);
  });

  it('completa si un reintento choca con "ya existe" (respuesta perdida)', async () => {
    // Primer intento: la petición llega a Storage pero la respuesta se pierde
    // ("Failed to fetch"). Segundo intento: el objeto ya existe.
    mockUpload
      .mockRejectedValueOnce(networkFailure())
      .mockResolvedValueOnce({
        data: null,
        error: new Error('The resource you are attempting to create already exists.'),
      });

    const path = await uploadPaymentProofTemp(new Blob(['proof'], { type: 'image/jpeg' }));

    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(path).toMatch(/^tmp\/.+\.jpg$/);
  });

  it('sube el blob como File con nombre y tipo correctos', async () => {
    mockUpload.mockResolvedValueOnce({ data: { path: 'tmp/ok.jpg' }, error: null });

    await uploadPaymentProofTemp(new Blob(['proof'], { type: 'image/jpeg' }));

    const [, body] = mockUpload.mock.calls[0];
    expect(body).toBeInstanceOf(File);
    expect((body as File).name).toBe('comprobante.jpg');
    expect((body as File).type).toBe('image/jpeg');
  });
});

describe('uploadPaymentProof', () => {
  it('usa la ruta del pedido y también reintenta fallos de red', async () => {
    mockUpload
      .mockRejectedValueOnce(networkFailure())
      .mockResolvedValueOnce({ data: { path: 'order-1/abc.jpg' }, error: null });

    const path = await uploadPaymentProof(
      new Blob(['proof'], { type: 'image/jpeg' }),
      'order-1',
    );

    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(path).toMatch(/^order-1\/.+\.jpg$/);
  });
});

describe('createOrder', () => {
  type OrderParams = Parameters<typeof createOrder>[0];

  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn((_row: Record<string, unknown>) => ({ select: mockSelect }));
  const mockFrom = vi.mocked(supabase.from);

  const baseOrder: OrderParams = {
    merchantId: 'm-1',
    customerId: 'c-1',
    orderType: 'pickup',
    paymentMethod: 'pago_movil',
    paymentReference: 'REF-1',
    totalAmount: 100,
    items: [],
  };

  /** Ejecuta `createOrder` y devuelve la fila que se intentó insertar. */
  async function insertOrder(overrides: Partial<OrderParams> = {}) {
    mockSingle.mockResolvedValue({ data: { id: 'order-1' }, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert } as unknown as ReturnType<
      typeof supabase.from
    >);

    await createOrder({ ...baseOrder, ...overrides });

    return mockInsert.mock.calls[0][0];
  }

  beforeEach(() => {
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockSingle.mockClear();
  });

  it('guarda los datos del pagador junto con el pedido', async () => {
    const row = await insertOrder({
      payer: { bank: 'Banesco', phone: '0412-1234567', idNumber: 'V12345678' },
    });

    expect(row).toMatchObject({
      payer_bank: 'Banesco',
      payer_phone: '0412-1234567',
      payer_id_number: 'V12345678',
    });
  });

  it('normaliza los espacios que el cliente deja en los campos', async () => {
    const row = await insertOrder({
      payer: { bank: '  Banesco  ', phone: ' 0412-1234567 ', idNumber: ' V12345678 ' },
    });

    expect(row).toMatchObject({
      payer_bank: 'Banesco',
      payer_phone: '0412-1234567',
      payer_id_number: 'V12345678',
    });
  });

  it('deja las columnas en null cuando el cliente no completó los datos', async () => {
    const row = await insertOrder({ payer: { bank: '', phone: '  ', idNumber: '' } });

    expect(row).toMatchObject({
      payer_bank: null,
      payer_phone: null,
      payer_id_number: null,
    });
  });

  it('descarta los datos del pagador en métodos sin Pago Móvil', async () => {
    const row = await insertOrder({
      paymentMethod: 'cash',
      payer: { bank: 'Banesco', phone: '0412-1234567', idNumber: 'V12345678' },
    });

    expect(row).toMatchObject({
      payer_bank: null,
      payer_phone: null,
      payer_id_number: null,
    });
  });

  it('sigue funcionando cuando no se envían datos del pagador', async () => {
    const row = await insertOrder();

    expect(row).toMatchObject({
      payer_bank: null,
      payer_phone: null,
      payer_id_number: null,
    });
  });
});
