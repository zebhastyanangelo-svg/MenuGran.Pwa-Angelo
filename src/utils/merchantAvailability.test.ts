import { describe, expect, it } from 'vitest';
import type { MerchantRow } from '../types/database';
import { getMerchantAvailability, isMerchantOpen } from './merchantAvailability';
import { parseWeeklyHours } from './weeklyHours';

/** Lunes 2026-10-05 a las 12:00 hora local. */
const MONDAY_NOON = new Date(2026, 9, 5, 12, 0);
/** Lunes 2026-10-05 a las 23:00 hora local. */
const MONDAY_NIGHT = new Date(2026, 9, 5, 23, 0);
/** Domingo 2026-10-11 a las 12:00 hora local. */
const SUNDAY_NOON = new Date(2026, 9, 11, 12, 0);

function buildMerchant(overrides: Partial<MerchantRow> = {}): MerchantRow {
  return {
    id: 'merchant-1',
    owner_id: 'owner-1',
    name: 'Sabor Criollo',
    slug: 'sabor-criollo',
    logo_url: null,
    banner_url: null,
    status: 'active',
    verification_docs: {},
    is_active: true,
    is_open: true,
    location: null,
    created_at: '2026-01-01T00:00:00.000Z',
    rif: 'J-123',
    category: 'Restaurante',
    description: null,
    address: 'Calle 1',
    zone: null,
    phone_whatsapp: '04120000000',
    service_modalities: [],
    business_hours: { days: '', open_time: '', close_time: '' },
    ...overrides,
  };
}

describe('isMerchantOpen', () => {
  it('respeta la agenda semanal del día actual', () => {
    const merchant = buildMerchant({
      weekly_hours: parseWeeklyHours({
        schedule: {
          monday: { is_open: true, open_time: '08:00', close_time: '20:00' },
        },
      }),
    });

    expect(isMerchantOpen(merchant, MONDAY_NOON)).toBe(true);
    expect(isMerchantOpen(merchant, MONDAY_NIGHT)).toBe(false);
  });

  it('cierra el día que la agenda marca como cerrado', () => {
    const merchant = buildMerchant({
      weekly_hours: parseWeeklyHours({
        schedule: {
          monday: { is_open: true, open_time: '08:00', close_time: '20:00' },
          sunday: { is_open: false, open_time: '08:00', close_time: '20:00' },
        },
      }),
    });

    expect(isMerchantOpen(merchant, SUNDAY_NOON)).toBe(false);
  });

  it('cae en las columnas legacy si no hay agenda semanal', () => {
    const merchant = buildMerchant({ opening_time: '08:00', closing_time: '20:00' });

    expect(isMerchantOpen(merchant, MONDAY_NOON)).toBe(true);
    expect(isMerchantOpen(merchant, MONDAY_NIGHT)).toBe(false);
  });

  it('cierra si el comercio desactivó manualmente la tienda', () => {
    const merchant = buildMerchant({
      is_open: false,
      weekly_hours: parseWeeklyHours({ schedule: { monday: { is_open: true, open_time: '00:00', close_time: '23:59' } } }),
    });

    expect(isMerchantOpen(merchant, MONDAY_NOON)).toBe(false);
  });

  it('cierra si el comercio está inactivo aunque el horario sea completo', () => {
    const merchant = buildMerchant({
      is_active: false,
      weekly_hours: parseWeeklyHours({ schedule: { monday: { is_open: true, open_time: '00:00', close_time: '23:59' } } }),
    });

    expect(isMerchantOpen(merchant, MONDAY_NOON)).toBe(false);
  });

  it('queda cerrado cuando no hay ni agenda ni horario configurado', () => {
    expect(isMerchantOpen(buildMerchant(), MONDAY_NOON)).toBe(false);
  });
});

describe('getMerchantAvailability', () => {
  it('expone la insignia y el rango del día según la agenda semanal', () => {
    const merchant = buildMerchant({
      weekly_hours: parseWeeklyHours({
        schedule: {
          monday: { is_open: true, open_time: '09:00', close_time: '17:00' },
        },
      }),
    });

    expect(getMerchantAvailability(merchant, MONDAY_NOON)).toEqual({
      isOpen: true,
      todayLabel: '09:00 – 17:00',
      badgeLabel: 'Abierto',
    });
  });

  it('indica Cerrado y el rango cuando el día no abre', () => {
    const merchant = buildMerchant({
      weekly_hours: parseWeeklyHours({
        schedule: {
          monday: { is_open: false, open_time: '09:00', close_time: '17:00' },
        },
      }),
    });

    expect(getMerchantAvailability(merchant, MONDAY_NOON)).toEqual({
      isOpen: false,
      todayLabel: 'Cerrado',
      badgeLabel: 'Cerrado',
    });
  });

  it('usa las columnas legacy cuando no hay agenda semanal', () => {
    const merchant = buildMerchant({ opening_time: '10:00', closing_time: '22:00' });

    expect(getMerchantAvailability(merchant, MONDAY_NOON).todayLabel).toBe('10:00 – 22:00');
  });

  it('avisa que el horario no está configurado en lugar de mostrar un rango vacío', () => {
    expect(getMerchantAvailability(buildMerchant(), MONDAY_NOON).todayLabel).toBe(
      'Horario no configurado',
    );
  });

  it('respeta el cierre manual aunque la agenda diga abierto', () => {
    const merchant = buildMerchant({
      is_open: false,
      weekly_hours: parseWeeklyHours({
        schedule: { monday: { is_open: true, open_time: '09:00', close_time: '17:00' } },
      }),
    });

    expect(getMerchantAvailability(merchant, MONDAY_NOON).badgeLabel).toBe('Cerrado');
  });
});