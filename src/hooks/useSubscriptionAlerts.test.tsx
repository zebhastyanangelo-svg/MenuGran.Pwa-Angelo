import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { useSubscriptionAlerts, SUBSCRIPTION_ALERTS_REFRESH_MS } from './useSubscriptionAlerts';
import { fetchMerchantsWithSubscriptionIssues } from '../services/superAdminService';

vi.mock('../services/superAdminService', () => ({
  fetchMerchantsWithSubscriptionIssues: vi.fn(),
}));

const mockFetch = vi.mocked(fetchMerchantsWithSubscriptionIssues);

function buildWrapper(): { wrapper: (props: { children: ReactNode }) => ReactElement } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

describe('useSubscriptionAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expone los comercios con suscripciones vencidas o por vencer', async () => {
    mockFetch.mockResolvedValue([
      {
        id: 'm-1',
        name: 'Comercio Vencido',
        subscription_expires_at: '2026-10-01',
        daysLeft: 0,
        status: 'expired',
      },
    ]);

    const { result } = renderHook(() => useSubscriptionAlerts(), buildWrapper());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.issues).toHaveLength(1);
    expect(result.current.issues[0]?.status).toBe('expired');
    expect(result.current.error).toBeNull();
  });

  it('traduce el fallo de la consulta a un mensaje de error', async () => {
    mockFetch.mockRejectedValue(new Error('permiso denegado'));

    const { result } = renderHook(() => useSubscriptionAlerts(), buildWrapper());

    await waitFor(() => expect(result.current.error).toBe('permiso denegado'));
    expect(result.current.issues).toEqual([]);
  });

  it('re-verifica cada 15 minutos mientras el dashboard está abierto', () => {
    expect(SUBSCRIPTION_ALERTS_REFRESH_MS).toBe(15 * 60 * 1000);
  });
});
