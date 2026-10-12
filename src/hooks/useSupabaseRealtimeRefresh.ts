import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

/**
 * Suscripción de refresco en tiempo real vía Supabase Realtime.
 *
 * Cada entrada declara una tabla (y filtro opcional de Postgres Changes) a
 * vigilar; cuando llega cualquier INSERT/UPDATE/DELETE se invoca `onRefresh`
 * tras un pequeño debounce para agrupar ráfagas de eventos en una sola
 * recarga y no martillear la base de datos.
 */
export interface RealtimeTableSubscription {
  table: string;
  filter?: string;
}

export interface UseSupabaseRealtimeRefreshOptions {
  /** Nombre único del canal de realtime. */
  channelName: string;
  /** Tablas (con filtro opcional) cuyos cambios disparan el refresco. */
  subscriptions: readonly RealtimeTableSubscription[];
  /** Acción de refresco a ejecutar cuando llegan cambios. */
  onRefresh: () => void;
  /** Evita suscribirse mientras no haya datos que refrescar. */
  enabled?: boolean;
  /** Ventana de agrupación de eventos en ms (por defecto 250). */
  debounceMs?: number;
}

type RealtimePayload = {
  eventType?: string;
};

function buildEventConfig(
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  subscription: RealtimeTableSubscription,
): {
  event: typeof event;
  schema: 'public';
  table: string;
  filter?: string;
} {
  return {
    event,
    schema: 'public',
    table: subscription.table,
    ...(subscription.filter !== undefined ? { filter: subscription.filter } : {}),
  };
}

/**
 * Registra un canal de Supabase Realtime que refresca datos de forma
 * reactiva. No devuelve nada: la mutación del estado queda en manos del
 * callback `onRefresh` del llamador.
 */
export function useSupabaseRealtimeRefresh(
  options: UseSupabaseRealtimeRefreshOptions,
): void {
  const { channelName, subscriptions, onRefresh, enabled = true, debounceMs = 250 } = options;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const subscriptionsKey = JSON.stringify(subscriptions);
  const subscriptionCount = subscriptions.length;

  useEffect(() => {
    if (!enabled || subscriptionCount === 0) return undefined;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const scheduleRefresh = (payload: unknown): void => {
      const eventType = (payload as RealtimePayload | null)?.eventType;
      if (eventType === 'SUBSCRIBE') return;
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (!disposed) onRefreshRef.current();
      }, debounceMs);
    };

    const parsedSubscriptions = JSON.parse(subscriptionsKey) as RealtimeTableSubscription[];
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelBuilder = supabase.channel(channelName);
      for (const subscription of parsedSubscriptions) {
        for (const event of ['INSERT', 'UPDATE', 'DELETE'] as const) {
          channelBuilder.on(
            'postgres_changes',
            buildEventConfig(event, subscription),
            scheduleRefresh,
          );
        }
      }
      channel = channelBuilder.subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(
            `[${channelName}] suscripción realtime falló:`,
            error?.message ?? status,
          );
        }
      });
    } catch (error) {
      // Degradación silenciosa: sin realtime la app sigue funcionando con la
      // carga inicial y los refrescos manuales.
      console.warn(
        `[${channelName}] no se pudo iniciar la suscripción realtime:`,
        error,
      );
      channel = null;
    }

    return () => {
      disposed = true;
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [channelName, subscriptionsKey, subscriptionCount, enabled, debounceMs]);

  return undefined;
}

export default useSupabaseRealtimeRefresh;
