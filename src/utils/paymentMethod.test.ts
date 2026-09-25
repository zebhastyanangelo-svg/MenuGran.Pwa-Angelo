import { describe, expect, it } from 'vitest';
import { getPaymentMethodLabel, requiresPaymentProof } from './paymentMethod';

describe('getPaymentMethodLabel', () => {
  it.each([
    ['pago_movil', 'Pago Móvil'],
    ['card_pos', 'Punto de Venta'],
    ['card', 'Tarjeta'],
    ['cash', 'Efectivo'],
    ['zelle', 'Zelle'],
  ] as const)('mapea %s a "%s"', (method, expected) => {
    expect(getPaymentMethodLabel(method)).toBe(expected);
  });
});

describe('requiresPaymentProof', () => {
  it('solo Pago Móvil exige comprobante', () => {
    expect(requiresPaymentProof('pago_movil')).toBe(true);
    expect(requiresPaymentProof('card_pos')).toBe(false);
    expect(requiresPaymentProof('cash')).toBe(false);
  });
});
