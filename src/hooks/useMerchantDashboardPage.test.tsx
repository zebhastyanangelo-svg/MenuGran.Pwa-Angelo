import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('../services/supabase', () => {
  const from = vi.fn()
  const channel = vi.fn()
  return {
    supabase: {
      from,
      channel,
      removeChannel: vi.fn(),
    },
    TABLE_NAMES: {
      profiles: 'profiles',
      merchants: 'merchants',
      merchantStaff: 'merchant_staff',
      categories: 'categories',
      products: 'products',
      orders: 'orders',
      deliveries: 'deliveries',
    },
  }
})

import { supabase } from '../services/supabase'
import { useMerchantDashboardPage } from './useMerchantDashboardPage'

type SupabaseMock = {
  from: ReturnType<typeof vi.fn>
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
}

const mockSupabase = supabase as unknown as SupabaseMock

function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

function buildWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function mockQueryResult<T>(data: T) {
  return { data, error: null, count: null, status: 200, statusText: 'OK' }
}

function merchantSelectChain() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockQueryResult([])),
      }),
    }),
  }
}

function merchantStaffSelectChain() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(
          mockQueryResult([{ merchant_id: 'm-1' }]),
        ),
      }),
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(
            mockQueryResult([{ merchant_id: 'm-1' }]),
          ),
        }),
      }),
    }),
  }
}

function ordersChain() {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(mockQueryResult(null)),
    }),
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(mockQueryResult([])),
      }),
    }),
  }
}

function productsChain() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => Promise.resolve({ count: 0, data: null, error: null })),
      }),
    }),
  }
}

function deliveriesChain(args: {
  deliveriesSelect: ReturnType<typeof vi.fn>
  deliveriesInsert: ReturnType<typeof vi.fn>
}) {
  const { deliveriesSelect, deliveriesInsert } = args
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: deliveriesSelect,
      }),
    }),
    insert: deliveriesInsert,
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(mockQueryResult(null)),
    }),
  }
}

describe('useMerchantDashboardPage.assignDriver', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
    mockSupabase.channel.mockReset()
    mockSupabase.removeChannel.mockReset()
    mockSupabase.channel.mockImplementation(() => {
      const ch = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      return ch
    })
  })

  it('crea un registro en deliveries cuando no existe y se asigna un driver', async () => {
    const deliveriesSelect = vi.fn().mockResolvedValue(mockQueryResult(null))
    const deliveriesInsert = vi.fn().mockResolvedValue(mockQueryResult(null))

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'merchants') return merchantSelectChain()
      if (table === 'merchant_staff') return merchantStaffSelectChain()
      if (table === 'orders') return ordersChain()
      if (table === 'products') return productsChain()
      if (table === 'deliveries')
        return deliveriesChain({ deliveriesSelect, deliveriesInsert })
      return {}
    })

    const client = buildQueryClient()
    const { result } = renderHook(
      () => useMerchantDashboardPage({ id: 'u-1' } as never),
      { wrapper: buildWrapper(client) },
    )

    await waitFor(() => {
      expect(result.current.drivers).toBeDefined()
    })

    await act(async () => {
      await result.current.assignDriver('order-1', 'driver-1')
    })

    expect(deliveriesSelect).toHaveBeenCalled()
    expect(deliveriesInsert).toHaveBeenCalledWith({
      order_id: 'order-1',
      driver_id: 'driver-1',
      status: 'assigned',
    })
  })

  it('actualiza el registro existente en deliveries cuando ya existe', async () => {
    const deliveriesSelect = vi.fn().mockResolvedValue(
      mockQueryResult({ id: 'delivery-99' }),
    )
    const deliveriesInsert = vi.fn().mockResolvedValue(mockQueryResult(null))

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'merchants') return merchantSelectChain()
      if (table === 'merchant_staff') return merchantStaffSelectChain()
      if (table === 'orders') return ordersChain()
      if (table === 'products') return productsChain()
      if (table === 'deliveries')
        return deliveriesChain({ deliveriesSelect, deliveriesInsert })
      return {}
    })

    const client = buildQueryClient()
    const { result } = renderHook(
      () => useMerchantDashboardPage({ id: 'u-1' } as never),
      { wrapper: buildWrapper(client) },
    )

    await waitFor(() => {
      expect(result.current.drivers).toBeDefined()
    })

    await act(async () => {
      await result.current.assignDriver('order-1', 'driver-1')
    })

    expect(deliveriesSelect).toHaveBeenCalled()
    expect(deliveriesInsert).not.toHaveBeenCalled()
  })

  it('marca la entrega como unassigned al desasignar el driver', async () => {
    const deliveriesSelect = vi.fn().mockResolvedValue(
      mockQueryResult({ id: 'delivery-99' }),
    )
    const deliveriesInsert = vi.fn().mockResolvedValue(mockQueryResult(null))

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'merchants') return merchantSelectChain()
      if (table === 'merchant_staff') return merchantStaffSelectChain()
      if (table === 'orders') return ordersChain()
      if (table === 'products') return productsChain()
      if (table === 'deliveries')
        return deliveriesChain({ deliveriesSelect, deliveriesInsert })
      return {}
    })

    const client = buildQueryClient()
    const { result } = renderHook(
      () => useMerchantDashboardPage({ id: 'u-1' } as never),
      { wrapper: buildWrapper(client) },
    )

    await waitFor(() => {
      expect(result.current.drivers).toBeDefined()
    })

    await act(async () => {
      await result.current.assignDriver('order-1', null)
    })

    expect(deliveriesSelect).toHaveBeenCalled()
    expect(deliveriesInsert).not.toHaveBeenCalled()
  })
})