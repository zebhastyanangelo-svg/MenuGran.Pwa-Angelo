import type { PaymentMethod } from '../types/database';

/**
 * Etiqueta legible del método de pago registrado en `orders.payment_method`.
 * Usada en el panel de pedidos del comercio (columna PAGO) y en el detalle.
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'pago_movil':
      return 'Pago Móvil';
    case 'card_pos':
      return 'Punto de Venta';
    case 'card':
      return 'Tarjeta';
    case 'cash':
      return 'Efectivo';
    case 'zelle':
      return 'Zelle';
    default:
      return method;
  }
}

/**
 * Indica si el método de pago exige comprobante (solo Pago Móvil).
 * Para otros métodos el panel nunca muestra el botón de comprobante.
 */
export function requiresPaymentProof(method: PaymentMethod): boolean {
  return method === 'pago_movil';
}
