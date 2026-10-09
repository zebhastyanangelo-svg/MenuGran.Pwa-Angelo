import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrderReminderScheduler } from './useOrderReminderScheduler';
import type { OrderStatus } from '../types/database';

describe('useOrderReminderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderScheduler(
    orderId: string | null,
    status: OrderStatus | null,
    onReminder: ReturnType<typeof vi.fn>,
  ) {
    return renderHook(
      ({ id, currentStatus }: { id: string | null; currentStatus: OrderStatus | null }) =>
        useOrderReminderScheduler({ orderId: id, status: currentStatus, onReminder }),
      { initialProps: { id: orderId, currentStatus: status } },
    );
  }

  it('dispara el recordatorio cuando vence el delay del estado', () => {
    const onReminder = vi.fn();
    renderScheduler('order-1', 'payment_pending', onReminder);

    vi.advanceTimersByTime(15 * 60_000 - 1);
    expect(onReminder).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onReminder).toHaveBeenCalledTimes(1);
    expect(onReminder).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', status: 'payment_pending' }),
    );
  });

  it('no programa recordatorios para estados sin regla', () => {
    const onReminder = vi.fn();
    renderScheduler('order-1', 'on_the_way', onReminder);

    vi.advanceTimersByTime(60 * 60_000);
    expect(onReminder).not.toHaveBeenCalled();
  });

  it('no programa recordatorios sin orderId ni status', () => {
    const onReminder = vi.fn();
    const { rerender } = renderHook(
      ({ id, currentStatus }: { id: string | null; currentStatus: OrderStatus | null }) =>
        useOrderReminderScheduler({ orderId: id, status: currentStatus, onReminder }),
      { initialProps: { id: null as string | null, currentStatus: 'ready' as OrderStatus | null } },
    );

    rerender({ id: 'order-1', currentStatus: null });
    vi.advanceTimersByTime(60 * 60_000);

    expect(onReminder).not.toHaveBeenCalled();
  });

  it('cancela el temporizador cuando el pedido avanza de estado', () => {
    const onReminder = vi.fn();
    const { rerender } = renderHook(
      ({ id, currentStatus }: { id: string | null; currentStatus: OrderStatus | null }) =>
        useOrderReminderScheduler({ orderId: id, status: currentStatus, onReminder }),
      { initialProps: { id: 'order-1', currentStatus: 'ready' as OrderStatus | null } },
    );

    vi.advanceTimersByTime(5 * 60_000);
    rerender({ id: 'order-1', currentStatus: 'on_the_way' });
    vi.advanceTimersByTime(60 * 60_000);

    expect(onReminder).not.toHaveBeenCalled();
  });

  it('cancela el temporizador al desmontar', () => {
    const onReminder = vi.fn();
    const { unmount } = renderScheduler('order-1', 'ready', onReminder);

    vi.advanceTimersByTime(5 * 60_000);
    unmount();
    vi.advanceTimersByTime(60 * 60_000);

    expect(onReminder).not.toHaveBeenCalled();
  });

  it('reprograma el recordatorio si el pedido vuelve al mismo estado', () => {
    const onReminder = vi.fn();
    const { rerender } = renderHook(
      ({ id, currentStatus }: { id: string | null; currentStatus: OrderStatus | null }) =>
        useOrderReminderScheduler({ orderId: id, status: currentStatus, onReminder }),
      { initialProps: { id: 'order-1', currentStatus: 'ready' as OrderStatus | null } },
    );

    vi.advanceTimersByTime(9 * 60_000);
    rerender({ id: 'order-1', currentStatus: 'preparing' });
    rerender({ id: 'order-1', currentStatus: 'ready' });

    vi.advanceTimersByTime(9 * 60_000);
    expect(onReminder).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(onReminder).toHaveBeenCalledTimes(1);
  });
});
