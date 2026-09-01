import { describe, expect, it } from 'vitest';
import { getOrderTypeLabel, ORDER_TYPE_LABELS } from './orderType';
import type { OrderType } from '../types/database';

describe('orderType utilities', () => {
  it('mapea cada tipo de orden a su etiqueta en español', () => {
    expect(getOrderTypeLabel('in_store')).toBe('Comer en el local');
    expect(getOrderTypeLabel('pickup')).toBe('Retiro en local');
    expect(getOrderTypeLabel('delivery')).toBe('Delivery');
  });

  it('mantiene el mapa de etiquetas en sincronía con los tipos de orden', () => {
    const expected: Record<OrderType, string> = {
      in_store: 'Comer en el local',
      pickup: 'Retiro en local',
      delivery: 'Delivery',
    };
    expect(ORDER_TYPE_LABELS).toEqual(expected);
  });

  it('retorna el tipo original para valores no mapeados', () => {
    expect(getOrderTypeLabel('in_store')).not.toBe('in_store');
  });
});
