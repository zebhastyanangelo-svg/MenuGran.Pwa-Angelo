import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMerchant,
  sanitizeImageUrl,
  sanitizeMerchantImageUpdates,
  updateMerchant,
} from './merchantService';
import type { CreateMerchantPayload } from './merchantService';
import type { MerchantRow } from '../types/database';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    from: supabaseMocks.from,
  },
}));

vi.mock('./storageService', () => ({
  uploadPublicImage: vi.fn(),
  deletePublicImageFromUrl: vi.fn().mockResolvedValue(true),
}));

interface Chain {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

/**
 * Constructor del builder encadenable de Supabase tal como lo usa el
 * servicio: `insert().select().single()` y `update().eq().select().single()`.
 */
function buildChain(): Chain {
  const chain: Chain = {
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  chain.insert.mockReturnValue({ select: chain.select });
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.single.mockResolvedValue({ data: null, error: null });
  return chain;
}

const merchantsChain = buildChain();

const merchantRow: MerchantRow = {
  id: 'merchant-1',
  owner_id: 'user-1',
  name: 'Pizzería La Trattoria',
  slug: 'pizzeria-la-trattoria',
  logo_url: null,
  banner_url: null,
  status: 'active',
  verification_docs: {} as Record<string, unknown>,
  is_active: true,
  is_open: true,
  location: null,
  created_at: new Date().toISOString(),
  rif: 'J-12345678-0',
  category: 'Restaurante',
  description: null,
  address: 'Calle 123',
  zone: null,
  phone_whatsapp: '+58 412-123-4567',
  service_modalities: ['Delivery'],
  business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
};

function buildPayload(
  overrides: Partial<CreateMerchantPayload> = {},
): CreateMerchantPayload {
  return {
    name: 'Pizzería La Trattoria',
    slug: 'pizzeria-la-trattoria',
    rif: 'J-12345678-0',
    category: 'Restaurante',
    description: null,
    address: 'Calle 123',
    phone_whatsapp: '+58 412-123-4567',
    service_modalities: ['Delivery'],
    business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
    logo_url: null,
    banner_url: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  merchantsChain.single.mockResolvedValue({ data: merchantRow, error: null });
  merchantsChain.insert.mockReturnValue({ select: merchantsChain.select });
  merchantsChain.update.mockReturnValue(merchantsChain);
  merchantsChain.eq.mockReturnValue(merchantsChain);
  merchantsChain.select.mockReturnValue(merchantsChain);
  supabaseMocks.from.mockReturnValue(merchantsChain);
  supabaseMocks.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
});

describe('sanitizeImageUrl', () => {
  it('conserva las URLs web válidas (http/https)', () => {
    expect(sanitizeImageUrl('https://i.ibb.co/logo.png')).toBe(
      'https://i.ibb.co/logo.png',
    );
    expect(sanitizeImageUrl('http://i.ibb.co/logo.png')).toBe(
      'https://i.ibb.co/logo.png',
    );
  });

  it('normaliza a null las URLs efímeras (blob:) que mueren fuera de su sesión', () => {
    expect(sanitizeImageUrl('blob:https://menugran.app/7c9e6679-42')).toBeNull();
  });

  it('normaliza a null las URLs data: y los objetos serializados', () => {
    expect(sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
    expect(sanitizeImageUrl('[object Object]')).toBeNull();
  });

  it('normaliza a null los valores vacíos o nulos', () => {
    expect(sanitizeImageUrl(null)).toBeNull();
    expect(sanitizeImageUrl(undefined)).toBeNull();
    expect(sanitizeImageUrl('   ')).toBeNull();
  });
});

describe('sanitizeMerchantImageUpdates', () => {
  it('sanitiza logo_url y banner_url presentes en la actualización', () => {
    const result = sanitizeMerchantImageUpdates({
      name: 'Nuevo nombre',
      logo_url: 'blob:https://menugran.app/123',
      banner_url: 'https://i.ibb.co/banner.jpg',
    });

    expect(result).toEqual({
      name: 'Nuevo nombre',
      logo_url: null,
      banner_url: 'https://i.ibb.co/banner.jpg',
    });
  });

  it('no agrega las claves de imagen cuando no vienen en la actualización', () => {
    const result = sanitizeMerchantImageUpdates({ name: 'Nuevo nombre' });

    expect(result).toEqual({ name: 'Nuevo nombre' });
    expect('logo_url' in result).toBe(false);
    expect('banner_url' in result).toBe(false);
  });
});

describe('createMerchant', () => {
  it('persiste null cuando el payload trae URLs blob: efímeras', async () => {
    await createMerchant(
      buildPayload({
        logo_url: 'blob:https://menugran.app/123',
        banner_url: 'blob:https://menugran.app/456',
      }),
    );

    expect(merchantsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ logo_url: null, banner_url: null }),
    );
  });

  it('persiste las URLs web válidas del payload', async () => {
    await createMerchant(
      buildPayload({
        logo_url: 'https://i.ibb.co/logo.png',
        banner_url: 'https://i.ibb.co/banner.jpg',
      }),
    );

    expect(merchantsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        logo_url: 'https://i.ibb.co/logo.png',
        banner_url: 'https://i.ibb.co/banner.jpg',
      }),
    );
  });
});

describe('updateMerchant', () => {
  it('sanitiza las URLs de imagen inválidas antes de enviar la actualización', async () => {
    await updateMerchant('merchant-1', {
      name: 'Nuevo nombre',
      logo_url: 'blob:https://menugran.app/123',
      banner_url: 'https://i.ibb.co/banner.jpg',
    });

    expect(merchantsChain.update).toHaveBeenCalledWith({
      name: 'Nuevo nombre',
      logo_url: null,
      banner_url: 'https://i.ibb.co/banner.jpg',
    });
    expect(merchantsChain.eq).toHaveBeenCalledWith('id', 'merchant-1');
  });

  it('envía la actualización sin tocar las claves de imagen ausentes', async () => {
    await updateMerchant('merchant-1', { is_open: true });

    expect(merchantsChain.update).toHaveBeenCalledWith({ is_open: true });
  });
});
