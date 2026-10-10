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
  isNetworkUploadError,
  uploadPaymentProof,
  uploadPaymentProofTemp,
} from './checkoutService';

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
