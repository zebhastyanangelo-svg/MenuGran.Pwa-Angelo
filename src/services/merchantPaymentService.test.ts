import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMerchantPagoMovil,
  mapMerchantPagoMovil,
} from './merchantPaymentService';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: supabaseMocks.from },
  TABLE_NAMES: { merchants: 'merchants' },
}));

describe('mapMerchantPagoMovil', () => {
  it('devuelve null cuando no hay fila', () => {
    expect(mapMerchantPagoMovil(null)).toBeNull();
  });

  it('devuelve los datos normalizados cuando la fila está completa', () => {
    const info = mapMerchantPagoMovil({
      pago_movil_bank: ' Banesco ',
      pago_movil_id_number: ' J-123456789 ',
      pago_movil_phone: ' 0412-1234567 ',
    });

    expect(info).toEqual({
      bank: 'Banesco',
      idNumber: 'J-123456789',
      phone: '0412-1234567',
    });
  });

  it.each([
    ['banco vacío', null, 'J-123456789', '0412-1234567'],
    ['cédula/RIF vacío', 'Banesco', '   ', '0412-1234567'],
    ['teléfono nulo', 'Banesco', 'J-123456789', null],
  ])('devuelve null si falta el campo: %s', (_label, bank, idNumber, phone) => {
    expect(
      mapMerchantPagoMovil({
        pago_movil_bank: bank,
        pago_movil_id_number: idNumber,
        pago_movil_phone: phone,
      }),
    ).toBeNull();
  });
});

describe('fetchMerchantPagoMovil', () => {
  beforeEach(() => {
    supabaseMocks.from.mockReset();
  });

  function buildQueryChain(result: {
    data: Record<string, string | null> | null;
    error: Error | null;
  }) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
    };
    supabaseMocks.from.mockReturnValue(chain);
    return chain;
  }

  it('devuelve null sin consultar cuando el merchantId está vacío', async () => {
    await expect(fetchMerchantPagoMovil('   ')).resolves.toBeNull();
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('consulta la tabla merchants y mapea los datos de Pago Móvil', async () => {
    const chain = buildQueryChain({
      data: {
        pago_movil_bank: 'Mercantil',
        pago_movil_id_number: 'V-12345678',
        pago_movil_phone: '0414-9876543',
      },
      error: null,
    });

    const info = await fetchMerchantPagoMovil('merchant-1');

    expect(supabaseMocks.from).toHaveBeenCalledWith('merchants');
    expect(chain.eq).toHaveBeenCalledWith('id', 'merchant-1');
    expect(info).toEqual({
      bank: 'Mercantil',
      idNumber: 'V-12345678',
      phone: '0414-9876543',
    });
  });

  it('devuelve null cuando el comercio no tiene datos configurados', async () => {
    buildQueryChain({ data: null, error: null });
    await expect(fetchMerchantPagoMovil('merchant-1')).resolves.toBeNull();
  });

  it('propaga el error de Supabase', async () => {
    buildQueryChain({ data: null, error: new Error('postgrest down') });
    await expect(fetchMerchantPagoMovil('merchant-1')).rejects.toThrow(
      'postgrest down',
    );
  });
});
