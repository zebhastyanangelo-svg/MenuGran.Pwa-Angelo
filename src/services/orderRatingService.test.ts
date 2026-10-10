import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  NEGATIVE_DRIVER_RATING_THRESHOLD,
  PLATFORM_IMPROVEMENT_OPTIONS,
  buildOrderRatingInsert,
  buildSurveySteps,
  fetchDriverRatingSummary,
  fetchMerchantRatingSummary,
  fetchMerchantRatingsMap,
  fetchPlatformRatingSummary,
  hasCustomerRatedOrder,
  isNegativeDriverRating,
  submitOrderRating,
  summarizeStars,
  validateSurveyAnswers,
  type SurveyAnswers,
} from './orderRatingService';
import type { OrderRow } from '../types/database';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

const pushMocks = vi.hoisted(() => ({
  sendNegativeDriverRatingAlert: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: supabaseMocks.from },
  TABLE_NAMES: { orderRatings: 'order_ratings' },
}));

vi.mock('./pushNotificationService', () => ({
  sendNegativeDriverRatingAlert: pushMocks.sendNegativeDriverRatingAlert,
}));

function buildOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1',
    merchant_id: 'merchant-1',
    customer_id: 'customer-1',
    driver_id: 'driver-1',
    type: 'delivery',
    status: 'delivered',
    payment_method: 'cash',
    payment_reference: null,
    payment_proof_url: null,
    total_amount: '25.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    delivery_address: null,
    latitude: null,
    longitude: null,
    items: [],
    created_at: '2026-10-09T12:00:00Z',
    ...overrides,
  };
}

function buildAnswers(overrides: Partial<SurveyAnswers> = {}): SurveyAnswers {
  return {
    merchantStars: 5,
    merchantSpeed: 'muy_rapido',
    merchantServiceQuality: 'muy_bueno',
    driverStars: 5,
    driverSpeed: 'rapido',
    driverTreatment: 'bueno',
    platformStars: 5,
    platformImprovements: ['interfaz'],
    platformComment: null,
    ...overrides,
  };
}

/** Cadena de mock para inserts de order_ratings. */
function mockInsertChain(result: { error: unknown }) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    select: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  return chain;
}

/** Cadena de mock para selects: filtra por columna si se pide, thenable. */
function mockSelectRows(rows: Array<Record<string, unknown>>, filterColumn?: string) {
  let filtered = rows;
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((column: string, value: unknown) => {
      if (filterColumn !== undefined && column === filterColumn) {
        filtered = rows.filter((row) => row[filterColumn] === value);
      }
      return chain;
    }),
    maybeSingle: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: filtered[0] ?? null, error: null }),
    ),
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: filtered, error: null }),
  };
  return chain;
}

describe('buildSurveySteps', () => {
  it('incluye el paso de delivery solo para pedidos de delivery con repartidor', () => {
    expect(buildSurveySteps(buildOrder({ type: 'delivery', driver_id: 'd-1' }))).toEqual([
      'business',
      'delivery',
      'platform',
    ]);
  });

  it('omite el paso de delivery en retiro y consumo en local', () => {
    expect(buildSurveySteps(buildOrder({ type: 'pickup', driver_id: null }))).toEqual([
      'business',
      'platform',
    ]);
    expect(buildSurveySteps(buildOrder({ type: 'in_store', driver_id: null }))).toEqual([
      'business',
      'platform',
    ]);
  });

  it('omite el paso de delivery si el pedido de delivery no tiene repartidor', () => {
    expect(buildSurveySteps(buildOrder({ type: 'delivery', driver_id: null }))).toEqual([
      'business',
      'platform',
    ]);
  });
});

describe('isNegativeDriverRating', () => {
  it('considera negativas las notas <= 2 estrellas', () => {
    expect(isNegativeDriverRating(1)).toBe(true);
    expect(isNegativeDriverRating(2)).toBe(true);
    expect(isNegativeDriverRating(3)).toBe(false);
    expect(isNegativeDriverRating(5)).toBe(false);
    expect(isNegativeDriverRating(null)).toBe(false);
  });

  it('define el umbral en 2 estrellas', () => {
    expect(NEGATIVE_DRIVER_RATING_THRESHOLD).toBe(2);
  });
});

describe('validateSurveyAnswers', () => {
  it('acepta respuestas completas de un pedido con delivery', () => {
    const steps = buildSurveySteps(buildOrder());
    expect(validateSurveyAnswers(steps, buildAnswers())).toBeNull();
  });

  it('rechaza estrellas fuera de rango', () => {
    const steps = buildSurveySteps(buildOrder());
    expect(
      validateSurveyAnswers(steps, buildAnswers({ merchantStars: 0 })),
    ).toMatch(/negocio debe estar entre 1 y 5/);
    expect(
      validateSurveyAnswers(steps, buildAnswers({ platformStars: 6 })),
    ).toMatch(/MenuGran debe estar entre 1 y 5/);
  });

  it('exige velocidad y trato cuando se califica al repartidor', () => {
    const steps = buildSurveySteps(buildOrder());
    expect(
      validateSurveyAnswers(steps, buildAnswers({ driverSpeed: null })),
    ).toMatch(/velocidad de entrega/);
    expect(
      validateSurveyAnswers(steps, buildAnswers({ driverTreatment: null })),
    ).toMatch(/trato recibido/);
  });

  it('rechaza comentarios de más de 500 caracteres', () => {
    const steps = buildSurveySteps(buildOrder());
    expect(
      validateSurveyAnswers(steps, buildAnswers({
        platformComment: 'x'.repeat(501),
      })),
    ).toMatch(/comentario no puede superar/);
  });
});

describe('buildOrderRatingInsert', () => {
  it('mapea las respuestas del modal a la fila de order_ratings', () => {
    const order = buildOrder();
    const insert = buildOrderRatingInsert(order, buildAnswers(), buildSurveySteps(order));

    expect(insert).toMatchObject({
      order_id: 'order-1',
      merchant_id: 'merchant-1',
      customer_id: 'customer-1',
      driver_id: 'driver-1',
      merchant_stars: 5,
      merchant_speed: 'muy_rapido',
      merchant_service_quality: 'muy_bueno',
      driver_stars: 5,
      platform_stars: 5,
    });
  });

  it('deja los campos del repartidor en null en pedidos sin delivery', () => {
    const order = buildOrder({ type: 'pickup', driver_id: null });
    const insert = buildOrderRatingInsert(order, buildAnswers(), buildSurveySteps(order));

    expect(insert.driver_id).toBeNull();
    expect(insert.driver_stars).toBeNull();
    expect(insert.driver_speed).toBeNull();
    expect(insert.driver_treatment).toBeNull();
  });
});

describe('submitOrderRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMocks.sendNegativeDriverRatingAlert.mockResolvedValue({ ok: true, summary: { sent: 1, failed: 0, deleted: 0, deactivated: 0, total: 1 } });
  });

  it('guarda la encuesta y no alerta con nota alta al repartidor', async () => {
    supabaseMocks.from.mockReturnValue(mockInsertChain({ error: null }));

    const order = buildOrder();
    await submitOrderRating(order, buildAnswers(), buildSurveySteps(order));

    expect(supabaseMocks.from).toHaveBeenCalledWith('order_ratings');
    expect(pushMocks.sendNegativeDriverRatingAlert).not.toHaveBeenCalled();
  });

  it('dispara la alerta push cuando el repartidor recibe <= 2 estrellas', async () => {
    supabaseMocks.from.mockReturnValue(mockInsertChain({ error: null }));

    const order = buildOrder();
    await submitOrderRating(
      order,
      buildAnswers({ driverStars: 1, driverSpeed: 'normal', driverTreatment: 'normal' }),
      buildSurveySteps(order),
    );

    expect(pushMocks.sendNegativeDriverRatingAlert).toHaveBeenCalledWith('order-1', 1);
  });

  it('lanza error con mensaje claro si el insert falla', async () => {
    supabaseMocks.from.mockReturnValue(
      mockInsertChain({ error: { message: 'rls denied' } }),
    );

    const order = buildOrder();
    await expect(
      submitOrderRating(order, buildAnswers(), buildSurveySteps(order)),
    ).rejects.toThrow('No se pudo guardar tu calificación: rls denied');
  });

  it('no envía nada si la validación falla', async () => {
    supabaseMocks.from.mockReturnValue(mockInsertChain({ error: null }));

    await expect(
      submitOrderRating(buildOrder(), buildAnswers({ merchantStars: 0 }), buildSurveySteps(buildOrder())),
    ).rejects.toThrow();
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });
});

describe('summarizeStars', () => {
  it('calcula promedio y cantidad', () => {
    expect(summarizeStars([5, 4, 3])).toEqual({ average: 4, count: 3 });
  });

  it('devuelve ceros sin valoraciones', () => {
    expect(summarizeStars([])).toEqual({ average: 0, count: 0 });
  });
});

describe('resúmenes de valoraciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hasCustomerRatedOrder detecta encuestas existentes', async () => {
    supabaseMocks.from.mockImplementation(() =>
      mockSelectRows([{ id: 'r-1', order_id: 'order-1' }], 'order_id'),
    );

    expect(await hasCustomerRatedOrder('order-1')).toBe(true);
    expect(await hasCustomerRatedOrder('order-2')).toBe(false);
  });

  it('fetchMerchantRatingSummary promedia las estrellas del negocio', async () => {
    supabaseMocks.from.mockReturnValue(
      mockSelectRows([
        { merchant_stars: 5 },
        { merchant_stars: 4 },
        { merchant_stars: 3 },
      ]),
    );

    const summary = await fetchMerchantRatingSummary('merchant-1');
    expect(summary).toEqual({ average: 4, count: 3 });
  });

  it('fetchMerchantRatingsMap agrupa por comercio', async () => {
    supabaseMocks.from.mockReturnValue(
      mockSelectRows([
        { merchant_id: 'm-1', merchant_stars: 5 },
        { merchant_id: 'm-1', merchant_stars: 4 },
        { merchant_id: 'm-2', merchant_stars: 2 },
      ]),
    );

    const map = await fetchMerchantRatingsMap();
    expect(map['m-1']).toEqual({ average: 4.5, count: 2 });
    expect(map['m-2']).toEqual({ average: 2, count: 1 });
  });

  it('fetchPlatformRatingSummary promedia las estrellas de la plataforma', async () => {
    supabaseMocks.from.mockReturnValue(
      mockSelectRows([{ platform_stars: 5 }, { platform_stars: 3 }]),
    );

    const summary = await fetchPlatformRatingSummary();
    expect(summary).toEqual({ average: 4, count: 2 });
  });

  it('fetchDriverRatingSummary ignora filas sin nota al repartidor', async () => {
    supabaseMocks.from.mockReturnValue(
      mockSelectRows([{ driver_stars: 5 }, { driver_stars: null }, { driver_stars: 4 }]),
    );

    const summary = await fetchDriverRatingSummary('driver-1');
    expect(summary).toEqual({ average: 4.5, count: 2 });
  });

  it('propaga errores de supabase con mensaje claro', async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockRejectedValue(new Error('network down')),
    });

    await expect(fetchMerchantRatingSummary('m-1')).rejects.toThrow('network down');
  });
});

describe('PLATFORM_IMPROVEMENT_OPTIONS', () => {
  it('incluye la opción "otro" para comentarios personalizados', () => {
    const keys = PLATFORM_IMPROVEMENT_OPTIONS.map((option) => option.key);
    expect(keys).toContain('otro');
    expect(keys).toContain('interfaz');
    expect(keys).toContain('velocidad');
  });
});
