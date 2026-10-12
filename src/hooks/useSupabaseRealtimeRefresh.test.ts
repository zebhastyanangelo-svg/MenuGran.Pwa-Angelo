import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../services/supabase', () => {
  const registeredHandlers = new Map<string, (payload: unknown) => void>();
  const removeChannel = vi.fn();
  const channel = vi.fn().mockImplementation((name: string) => {
    const channelMock: Record<string, unknown> = {
      on: vi.fn().mockImplementation((...args: unknown[]) => {
        const [type, config, handler] = args;
        if (type === 'postgres_changes' && typeof handler === 'function') {
          const configKey = `${(config as { event: string }).event}:${(config as { table: string }).table}`;
          registeredHandlers.set(configKey, handler as (payload: unknown) => void);
        }
        return channelMock;
      }),
      subscribe: vi.fn().mockImplementation(() => channelMock),
    };
    void name;
    return channelMock;
  });
  return {
    supabase: {
      channel,
      removeChannel,
      __registeredHandlers: registeredHandlers,
    },
  };
});

import {
  useSupabaseRealtimeRefresh,
  type RealtimeTableSubscription,
} from './useSupabaseRealtimeRefresh';
import { supabase } from '../services/supabase';

type RealtimeTestSupabase = {
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
  __registeredHandlers: Map<string, (payload: unknown) => void>;
};

const mockSupabase = supabase as unknown as RealtimeTestSupabase;
const registeredHandlers = mockSupabase.__registeredHandlers;

const subscriptions: readonly RealtimeTableSubscription[] = [
  { table: 'merchants' },
  { table: 'products', filter: 'merchant_id=eq.m-1' },
];

describe('useSupabaseRealtimeRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSupabase.channel.mockClear();
    mockSupabase.removeChannel.mockClear();
    registeredHandlers.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('suscribe INSERT, UPDATE y DELETE para cada tabla declarada', () => {
    const onRefresh = vi.fn();
    renderHook(() =>
      useSupabaseRealtimeRefresh({
        channelName: 'test-channel',
        subscriptions,
        onRefresh,
      }),
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith('test-channel');
    expect(registeredHandlers.has('INSERT:merchants')).toBe(true);
    expect(registeredHandlers.has('UPDATE:merchants')).toBe(true);
    expect(registeredHandlers.has('DELETE:merchants')).toBe(true);
    expect(
      registeredHandlers.has('UPDATE:products'),
    ).toBe(true);
  });

  it('agrupa eventos consecutivos y refresca una sola vez (debounce)', () => {
    const onRefresh = vi.fn();
    renderHook(() =>
      useSupabaseRealtimeRefresh({
        channelName: 'debounce-channel',
        subscriptions,
        onRefresh,
      }),
    );

    const handler = registeredHandlers.get('INSERT:merchants');
    expect(handler).toBeDefined();

    handler?.({ eventType: 'INSERT' });
    handler?.({ eventType: 'UPDATE' });
    handler?.({ eventType: 'DELETE' });
    expect(onRefresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(260);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('ignora el evento SUBSCRIBE y no refresca', () => {
    const onRefresh = vi.fn();
    renderHook(() =>
      useSupabaseRealtimeRefresh({
        channelName: 'subscribe-channel',
        subscriptions,
        onRefresh,
      }),
    );

    const handler = registeredHandlers.get('INSERT:merchants');
    handler?.({ eventType: 'SUBSCRIBE' });
    vi.advanceTimersByTime(1000);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('no se suscribe cuando enabled es false', () => {
    renderHook(() =>
      useSupabaseRealtimeRefresh({
        channelName: 'disabled-channel',
        subscriptions,
        onRefresh: vi.fn(),
        enabled: false,
      }),
    );

    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('elimina el canal al desmontar', () => {
    const { unmount } = renderHook(() =>
      useSupabaseRealtimeRefresh({
        channelName: 'cleanup-channel',
        subscriptions,
        onRefresh: vi.fn(),
      }),
    );

    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);
  });
});
