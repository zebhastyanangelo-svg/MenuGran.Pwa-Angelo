import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActiveOrder, isActiveOrder } from '../hooks/useActiveOrder';

const mockGetLastOrder = vi.fn();
const mockGetOrderHistory = vi.fn();

vi.mock('../utils/offlineStorage', () => ({
  getLastOrder: (...args: unknown[]) => mockGetLastOrder(...args),
  getOrderHistory: (...args: unknown[]) => mockGetOrderHistory(...args),
}));

describe('useActiveOrder', () => {
  beforeEach(() => {
    mockGetLastOrder.mockClear();
    mockGetOrderHistory.mockClear();
  });

  it('returns isActive: false when there is no cached order', () => {
    mockGetLastOrder.mockReturnValue(null);

    const { result } = renderHook(() => useActiveOrder());
    expect(result.current.isActive).toBe(false);
    expect(result.current.order).toBeNull();
    expect(result.current.status).toBeNull();
  });

  it('returns isActive: true for an active order (confirmed)', () => {
    mockGetLastOrder.mockReturnValue({
      id: 'order-1',
      status: 'confirmed',
    } as any);

    const { result } = renderHook(() => useActiveOrder());
    expect(result.current.isActive).toBe(true);
    expect(result.current.status).toBe('confirmed');
    expect(result.current.order?.id).toBe('order-1');
  });

  it('returns isActive: false for a delivered order', () => {
    mockGetLastOrder.mockReturnValue({
      id: 'order-1',
      status: 'delivered',
    } as any);

    const { result } = renderHook(() => useActiveOrder());
    expect(result.current.isActive).toBe(false);
    expect(result.current.status).toBeNull();
  });

  it('returns isActive: false for a cancelled order', () => {
    mockGetLastOrder.mockReturnValue({
      id: 'order-1',
      status: 'cancelled',
    } as any);

    const { result } = renderHook(() => useActiveOrder());
    expect(result.current.isActive).toBe(false);
    expect(result.current.status).toBeNull();
  });

  it('returns isActive: true for payment_pending order', () => {
    mockGetLastOrder.mockReturnValue({
      id: 'order-1',
      status: 'payment_pending',
    } as any);

    const { result } = renderHook(() => useActiveOrder());
    expect(result.current.isActive).toBe(true);
    expect(result.current.status).toBe('payment_pending');
  });
});

describe('isActiveOrder', () => {
  it.each([
    ['payment_pending', true],
    ['confirmed', true],
    ['preparing', true],
    ['ready', true],
    ['on_the_way', true],
    ['delivered', false],
    ['cancelled', false],
  ])('isActiveOrder(%s) returns %s', (status: string, expected: boolean) => {
    expect(isActiveOrder(status as any)).toBe(expected);
  });
});