import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useDriverDashboard', () => ({
  useDriverDashboard: vi.fn(),
}))
vi.mock('../../hooks/useGpsTracking', () => ({
  useGpsTracking: vi.fn().mockReturnValue({
    position: null,
    error: null,
    tracking: false,
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
  }),
}))

import { useAuth } from '../../hooks/useAuth'
import { useDriverDashboard } from '../../hooks/useDriverDashboard'
import { DriverDashboard } from './DriverDashboard'

function renderPage() {
  return render(
    <BrowserRouter>
      <DriverDashboard />
    </BrowserRouter>,
  )
}

const today = new Date().toISOString()

const createOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-1',
  merchant_id: 'm-1',
  customer_id: 'c-1',
  driver_id: 'driver-1',
  type: 'delivery',
  status: 'ready',
  payment_method: 'cash',
  payment_reference: null,
  payment_proof_url: null,
  total_amount: 120,
  table_number: null,
  delivery_location: null,
  delivery_address_notes: 'Av. Principal 123, Caracas',
  items: [{ product_id: 'p-1', quantity: 2, unit_price: 60 }],
  created_at: today,
  profiles: {
    full_name: 'María Pérez',
    email: 'maria@example.com',
    phone: '+584141234567',
  },
  ...overrides,
})

describe('DriverDashboard', () => {
  beforeEach(() => {
    ;(useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'driver-1' },
      profile: {
        id: 'driver-1',
        email: 'driver@example.com',
        full_name: 'Carlos R',
        avatar_url: null,
        role: 'driver',
        created_at: today,
        updated_at: today,
      },
      signOut: vi.fn(),
    })
  })

  it('muestra el banner "Tienes una entrega pendiente" cuando hay un pedido asignado', () => {
    ;(useDriverDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      orders: [createOrder()],
      loading: false,
      error: null,
      actionLoading: false,
      actionError: null,
      takeOrder: vi.fn(),
      startDelivery: vi.fn(),
      markDelivered: vi.fn(),
      refresh: vi.fn(),
    })

    renderPage()

    expect(screen.getByTestId('driver-pending-banner')).toBeInTheDocument()
    expect(screen.getByText(/Tienes una entrega pendiente/i)).toBeInTheDocument()
  })

  it('muestra el nombre, dirección y productos del cliente asignado', () => {
    ;(useDriverDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      orders: [createOrder()],
      loading: false,
      error: null,
      actionLoading: false,
      actionError: null,
      takeOrder: vi.fn(),
      startDelivery: vi.fn(),
      markDelivered: vi.fn(),
      refresh: vi.fn(),
    })

    renderPage()

    expect(screen.getByText('María Pérez')).toBeInTheDocument()
    expect(screen.getByText('+584141234567')).toBeInTheDocument()
    expect(screen.getByText(/Av\. Principal 123/i)).toBeInTheDocument()
  })

  it('abre la ruta GPS al pulsar "Ver Ruta GPS"', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    ;(useDriverDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      orders: [createOrder()],
      loading: false,
      error: null,
      actionLoading: false,
      actionError: null,
      takeOrder: vi.fn(),
      startDelivery: vi.fn(),
      markDelivered: vi.fn(),
      refresh: vi.fn(),
    })

    renderPage()

    const routeBtn = screen.getByTestId('view-route')
    routeBtn.click()

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('google.com/maps'),
      '_blank',
    )
  })

  it('llama a startDelivery al pulsar "Iniciar Entrega"', async () => {
    const startDelivery = vi.fn().mockResolvedValue(undefined)
    ;(useDriverDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      orders: [createOrder()],
      loading: false,
      error: null,
      actionLoading: false,
      actionError: null,
      takeOrder: vi.fn(),
      startDelivery,
      markDelivered: vi.fn(),
      refresh: vi.fn(),
    })

    renderPage()

    screen.getByTestId('start-delivery').click()

    await waitFor(() => {
      expect(startDelivery).toHaveBeenCalledWith('order-1')
    })
  })

  it('muestra estado vacío cuando no hay pedidos asignados', () => {
    ;(useDriverDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      orders: [],
      loading: false,
      error: null,
      actionLoading: false,
      actionError: null,
      takeOrder: vi.fn(),
      startDelivery: vi.fn(),
      markDelivered: vi.fn(),
      refresh: vi.fn(),
    })

    renderPage()

    expect(screen.queryByTestId('driver-pending-banner')).not.toBeInTheDocument()
    expect(screen.getByTestId('driver-no-orders')).toBeInTheDocument()
  })
})