import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PUBLIC_MEDIA_BUCKET,
  PAYMENT_PROOF_BUCKET,
  buildPublicImagePath,
  deletePublicImageFromUrl,
  extractStorageReference,
  isManagedPublicImageUrl,
} from './storageService';

const supabaseMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => supabaseMocks),
    },
  },
  TABLE_NAMES: {},
}));

describe('buildPublicImagePath', () => {
  it('estructura la ruta por comercio y tipo de imagen', () => {
    const path = buildPublicImagePath('merchant-1', 'logo', 'image/png');
    expect(path).toMatch(/^merchants\/merchant-1\/logo\/\d+-[0-9a-f]+\.png$/);
  });

  it('usa jpg cuando el MIME es desconocido', () => {
    const path = buildPublicImagePath('merchant-1', 'dish', undefined);
    expect(path).toMatch(/^merchants\/merchant-1\/dish\/\d+-[0-9a-f]+\.jpg$/);
  });

  it('rechaza un id de comercio vacío', () => {
    expect(() => buildPublicImagePath('   ', 'banner')).toThrow(
      /id del comercio/i,
    );
  });
});

describe('extractStorageReference', () => {
  it('extrae bucket y ruta de una URL pública de Storage', () => {
    const reference = extractStorageReference(
      'https://ejemplo.supabase.co/storage/v1/object/public/merchant-media/merchants/m1/logo/a.jpg',
    );
    expect(reference).toEqual({
      bucket: 'merchant-media',
      path: 'merchants/m1/logo/a.jpg',
    });
  });

  it('extrae la referencia de una URL firmada del bucket privado', () => {
    const reference = extractStorageReference(
      'https://ejemplo.supabase.co/storage/v1/object/sign/payment-proofs/tmp/a.jpg?token=x',
    );
    expect(reference).toEqual({ bucket: 'payment-proofs', path: 'tmp/a.jpg' });
  });

  it('acepta referencias crudas bucket/ruta', () => {
    expect(extractStorageReference('merchant-media/merchants/m1/dish/a.jpg')).toEqual(
      { bucket: 'merchant-media', path: 'merchants/m1/dish/a.jpg' },
    );
  });

  it('devuelve null para URLs externas (ImgBB) y valores vacíos', () => {
    expect(extractStorageReference('https://i.ibb.co/logo.jpg')).toBeNull();
    expect(extractStorageReference(null)).toBeNull();
    expect(extractStorageReference('')).toBeNull();
  });
});

describe('isManagedPublicImageUrl', () => {
  it('solo acepta URLs del bucket público del catálogo', () => {
    expect(
      isManagedPublicImageUrl(
        'https://ejemplo.supabase.co/storage/v1/object/public/merchant-media/merchants/m1/logo/a.jpg',
      ),
    ).toBe(true);
    expect(isManagedPublicImageUrl('https://i.ibb.co/logo.jpg')).toBe(false);
    expect(isManagedPublicImageUrl('payment-proofs/tmp/a.jpg')).toBe(false);
  });
});

describe('deletePublicImageFromUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('borra el objeto del bucket público y devuelve true', async () => {
    supabaseMocks.remove.mockResolvedValue({ data: [], error: null });

    const result = await deletePublicImageFromUrl(
      'https://ejemplo.supabase.co/storage/v1/object/public/merchant-media/merchants/m1/logo/a.jpg',
    );

    expect(result).toBe(true);
    expect(supabaseMocks.remove).toHaveBeenCalledWith([
      'merchants/m1/logo/a.jpg',
    ]);
  });

  it('no intenta borrar URLs que no son del bucket público', async () => {
    const result = await deletePublicImageFromUrl('https://i.ibb.co/logo.jpg');
    expect(result).toBe(false);
    expect(supabaseMocks.remove).not.toHaveBeenCalled();
  });

  it('devuelve false (sin lanzar) si Storage rechaza el borrado', async () => {
    supabaseMocks.remove.mockResolvedValue({
      data: null,
      error: new Error('not found'),
    });

    const result = await deletePublicImageFromUrl(
      'https://ejemplo.supabase.co/storage/v1/object/public/merchant-media/merchants/m1/logo/a.jpg',
    );

    expect(result).toBe(false);
  });
});

describe('constantes de buckets', () => {
  it('separa el catálogo (público) de los comprobantes (privado)', () => {
    expect(PUBLIC_MEDIA_BUCKET).toBe('merchant-media');
    expect(PAYMENT_PROOF_BUCKET).toBe('payment-proofs');
    expect(PUBLIC_MEDIA_BUCKET).not.toBe(PAYMENT_PROOF_BUCKET);
  });
});
