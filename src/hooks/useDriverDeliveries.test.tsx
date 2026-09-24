import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

type EqCall = { column: string; value: unknown }

interface TerminalData {
  data: unknown
  error: null
}

interface ChainRecorder {
  eqCalls: EqCall[]
  query: Record<string, unknown>
}

const fromMock = vi.hoisted(() => vi.fn())

vi.mock('../services/supabase', () => {
  const channel = vi.fn().mockImplementation(() => {
    const channelMock: Record<string, unknown> = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }
    return channelMock
  })
  return {
    supabase: {
      from: fromMock,
      channel,
      removeChannel: vi.fn(),
    },
    TABLE_NAMES: {
      merchants: 'merchants',
      merchantStaff: 'merchant_staff',
      orders: 'orders',
      deliveries: 'deliveries',
      profiles: 'profiles',
    },
  }
})

import { useDriverDeliveries } from './useDriverDeliveries'

function buildChain(terminal: TerminalData): ChainRecorder {
  const eqCalls: EqCall[] = []
  const query: Record<string, unknown> = {}
  query.select = () => query
  query.eq = (column: string, value: unknown) => {
    eqCalls.push({ column, value })
    return query
  }
  query.in = () => query
  query.order = () => Promise.resolve(terminal)
  query.limit = () => Promise.resolve(terminal)
  query.maybeSingle = () => Promise.resolve(terminal)
  query.then = (resolve: (v: TerminalData) => unknown) => resolve(terminal)
  return { eqCalls, query }
}

interface MockTables {
  staffData: unknown
  ownerData: unknown[]
  ordersData: unknown[]
}

function configureTables(tables: MockTables): { ordersEqCalls: () => EqCall[] } {
  const chainByTable: Record<string, ChainRecorder> = {}
  fromMock.mockImplementation((table: string) => {
    if (table === 'deliveries') {
      return { select: vi.fn() }
    }
    if (table === 'merchant_staff') {
      chainByTable[table] = buildChain({ data: tables.staffData, error: null })
    } else if (table === 'merchants') {
      chainByTable[table] = buildChain({ data: tables.ownerData, error: null })
    } else {
      chainByTable[table] = buildChain({ data: tables.ordersData, error: null })
    }
    return chainByTable[table].query
  })
  return {
    ordersEqCalls: () => chainByTable.orders?.eqCalls ?? [],
  }
}

function buildOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'order-1',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: 'other-driver',
    type: 'delivery',
    status: 'ready',
    payment_method: 'cash',
    payment_reference: null,
    payment_proof_url: null,
    total_amount: 100,
    table_number: null,
    delivery_location: null,
    delivery_address: 'Calle 1',
    delivery_address_notes: null,
    latitude: null,
    longitude: null,
    items: [],
    created_at: new Date().toISOString(),
    profiles: null,
    ...overrides,
  }
}

const asUser = (id: string) => ({ id }) as unknown as User

describe('useDriverDeliveries — alcance por rol', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('driver: filtra las entregas por driver_id del usuario', async () => {
    const tables = configureTables({
      staffData: { merchant_id: 'm-1', merchants: { id: 'm-1', name: 'La Pizza' } },
      ownerData: [],
      ordersData: [buildOrder({ driver_id: 'other-driver' })],
    })

    const { result } = renderHook(() =>
      useDriverDeliveries(asUser('driver-1'), { role: 'driver' }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    const eqCalls = tables.ordersEqCalls()
    expect(eqCalls).toContainEqual({ column: 'driver_id', value: 'driver-1' })
    expect(result.current.assigned).toHaveLength(0)
  })

  it('merchant_owner: resuelve el comercio por owner_id y no filtra por driver_id', async () => {
    const tables = configureTables({
      staffData: null,
      ownerData: [{ id: 'm-9', name: 'Burger House' }],
      ordersData: [buildOrder()],
    })

    const { result } = renderHook(() =>
      useDriverDeliveries(asUser('owner-1'), { role: 'merchant_owner' }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.merchantName).toBe('Burger House')
    expect(
      tables.ordersEqCalls().some((c) => c.column === 'driver_id'),
    ).toBe(false)
    expect(result.current.assigned).toHaveLength(1)
  })

  it('merchant_staff: ve las entregas del comercio aunque estén asignadas a otro repartidor', async () => {
    configureTables({
      staffData: { merchant_id: 'm-1', merchants: { id: 'm-1', name: 'La Pizza' } },
      ownerData: [],
      ordersData: [
        buildOrder({ id: 'order-1', driver_id: 'driver-9', status: 'ready' }),
        buildOrder({ id: 'order-2', driver_id: 'driver-10', status: 'delivered' }),
      ],
    })

    const { result } = renderHook(() =>
      useDriverDeliveries(asUser('staff-1'), { role: 'merchant_staff' }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.merchantName).toBe('La Pizza')
    expect(result.current.assigned.map((o) => o.id)).toContain('order-1')
    expect(result.current.delivered.map((o) => o.id)).toContain('order-2')
  })
})
