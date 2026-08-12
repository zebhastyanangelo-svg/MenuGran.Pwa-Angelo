import { describe, expect, it } from 'vitest';
import {
  ORDER_STATUS_ORDER,
  getAllowedTransitions,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  getTransitionButtonClass,
  getTransitionLabel,
} from './orderStatus';
import type { OrderStatus } from '../types/database';

describe('orderStatus utilities', () => {
  it('maps each order status to a Spanish label', () => {
    expect(getOrderStatusLabel('payment_pending')).toBe('Pendiente de Pago');
    expect(getOrderStatusLabel('confirmed')).toBe('Confirmado');
    expect(getOrderStatusLabel('preparing')).toBe('En Preparación');
    expect(getOrderStatusLabel('ready')).toBe('Listo');
    expect(getOrderStatusLabel('on_the_way')).toBe('En Camino');
    expect(getOrderStatusLabel('delivered')).toBe('Entregado');
    expect(getOrderStatusLabel('cancelled')).toBe('Cancelado');
  });

  it('exposes every status in canonical order', () => {
    expect(ORDER_STATUS_ORDER).toEqual([
      'payment_pending',
      'confirmed',
      'preparing',
      'ready',
      'on_the_way',
      'delivered',
      'cancelled',
    ]);
  });

  it('returns a color class for every status', () => {
    ORDER_STATUS_ORDER.forEach((status) => {
      expect(typeof getOrderStatusBadgeClass(status)).toBe('string');
    });
  });

  it('allows logical transitions only', () => {
    expect(getAllowedTransitions('payment_pending')).toEqual([
      'confirmed',
      'cancelled',
    ]);
    expect(getAllowedTransitions('confirmed')).toContain('preparing');
    expect(getAllowedTransitions('preparing')).toContain('ready');
    expect(getAllowedTransitions('ready')).toContain('on_the_way');
    expect(getAllowedTransitions('on_the_way')).toContain('delivered');
    expect(getAllowedTransitions('delivered')).toEqual([]);
    expect(getAllowedTransitions('cancelled')).toEqual([]);
  });

  it('labels and styles transitions', () => {
    expect(getTransitionLabel('confirmed')).toBe('Aceptar pago');
    expect(getTransitionLabel('cancelled')).toBe('Rechazar');
    expect(getTransitionLabel('preparing')).toBe('Marcar como preparando');
    expect(getTransitionLabel('ready')).toBe('Marcar como listo');
    expect(getTransitionLabel('on_the_way')).toBe('Enviar para entrega');
    expect(getTransitionLabel('delivered')).toBe('Marcar como entregado');
    expect(typeof getTransitionButtonClass('confirmed')).toBe('string');
  });

  it('keeps the label and transition maps in sync with the status order', () => {
    const labels: Record<OrderStatus, string> = {
      payment_pending: 'Pendiente de Pago',
      confirmed: 'Confirmado',
      preparing: 'En Preparación',
      ready: 'Listo',
      on_the_way: 'En Camino',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    ORDER_STATUS_ORDER.forEach((status) => {
      expect(getOrderStatusLabel(status)).toBe(labels[status]);
    });
  });
});
