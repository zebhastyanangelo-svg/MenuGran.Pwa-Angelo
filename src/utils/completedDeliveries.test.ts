import { describe, expect, it } from 'vitest';
import {
  filterDeliveredOrdersByPeriod,
  formatCompletedPeriodLabel,
  getCompletedPeriodRange,
  type CompletedPeriod,
} from './completedDeliveries';

const HOUR_MS = 60 * 60 * 1000;

const createOrder = (id: string, createdAt: Date) => ({
  id,
  created_at: createdAt.toISOString(),
});

describe('getCompletedPeriodRange', () => {
  const now = new Date(2026, 9, 9, 15, 30, 0);

  it('para hoy devuelve desde las 00:00 hasta las 00:00 del día siguiente', () => {
    const { start, end } = getCompletedPeriodRange('today', 0, now);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(24 * HOUR_MS);
  });

  it('para semana inicia en lunes 00:00 y dura 7 días', () => {
    const { start, end } = getCompletedPeriodRange('week', 0, now);
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * HOUR_MS);
  });

  it('el offset de semana retrocede una semana completa por paso', () => {
    const current = getCompletedPeriodRange('week', 0, now);
    const previous = getCompletedPeriodRange('week', 1, now);
    expect(current.start.getTime() - previous.start.getTime()).toBe(7 * 24 * HOUR_MS);
  });

  it('para mes inicia el día 1 y termina el día 1 del mes siguiente', () => {
    const { start, end } = getCompletedPeriodRange('month', 0, now);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(9);
    expect(end.getDate()).toBe(1);
    expect(end.getMonth()).toBe(10);
  });

  it('el offset de mes retrocede en la misma fecha del mes anterior', () => {
    const previous = getCompletedPeriodRange('month', 1, now);
    expect(previous.start.getDate()).toBe(1);
    expect(previous.start.getMonth()).toBe(8);
  });
});

describe('filterDeliveredOrdersByPeriod', () => {
  const now = new Date(2026, 9, 9, 15, 30, 0);

  const cases: { period: CompletedPeriod; offset: number }[] = [
    { period: 'today', offset: 0 },
    { period: 'week', offset: 0 },
    { period: 'week', offset: 1 },
    { period: 'month', offset: 0 },
    { period: 'month', offset: 2 },
  ];

  it.each(cases)('incluye pedidos dentro del rango y excluye los de fuera ($period, offset $offset)', ({ period, offset }) => {
    const { start, end } = getCompletedPeriodRange(period, offset, now);
    const orders = [
      createOrder('dentro-inicio', new Date(start.getTime() + HOUR_MS)),
      createOrder('dentro-fin', new Date(end.getTime() - HOUR_MS)),
      createOrder('fuera-antes', new Date(start.getTime() - HOUR_MS)),
      createOrder('fuera-despues', new Date(end.getTime() + HOUR_MS)),
    ];

    const filtered = filterDeliveredOrdersByPeriod(orders, period, offset, now);

    expect(filtered.map((order) => order.id)).toEqual(['dentro-inicio', 'dentro-fin']);
  });

  it('por defecto (hoy) excluye pedidos de ayer y de mañana', () => {
    const orders = [
      createOrder('hoy', new Date(2026, 9, 9, 8, 0, 0)),
      createOrder('ayer', new Date(2026, 9, 8, 23, 0, 0)),
      createOrder('mañana', new Date(2026, 9, 10, 1, 0, 0)),
    ];

    const filtered = filterDeliveredOrdersByPeriod(orders, 'today', 0, now);

    expect(filtered.map((order) => order.id)).toEqual(['hoy']);
  });
});

describe('formatCompletedPeriodLabel', () => {
  const now = new Date(2026, 9, 9, 15, 30, 0);

  it('para hoy muestra "Hoy"', () => {
    expect(formatCompletedPeriodLabel('today', 0, now)).toBe('Hoy');
  });

  it('para la semana actual menciona "Esta semana"', () => {
    expect(formatCompletedPeriodLabel('week', 0, now)).toMatch(/Esta semana/);
  });

  it('para una semana anterior menciona el rango de días', () => {
    expect(formatCompletedPeriodLabel('week', 1, now)).toMatch(/Semana del/);
  });

  it('para el mes muestra el nombre del mes y el año', () => {
    const label = formatCompletedPeriodLabel('month', 0, now);
    expect(label).toMatch(/octubre/i);
    expect(label).toMatch(/2026/);
  });
});
