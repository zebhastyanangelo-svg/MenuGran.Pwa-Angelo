import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useDriverDeliveries', () => ({
  useDriverDeliveries: vi.fn(),
}))

import { useAuth } from '../../hooks/useAuth'
import { useDriverDeliveries } from '../../hooks/useDriverDeliveries'
import { DriverDeliveriesPage } from './DriverDeliveriesPage'

function renderPage() {
  return render(
    <BrowserRouter>
      <DriverDeliveriesPage />
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

const defaultHookReturn = {
  merchantName: 'La Pizza',
  assigned: [],
  inTransit: [],
  delivered: [],
  loading: false,
  error: null,
  actionLoading: false,
  actionError: null,
  takeOrder: vi.fn(),
  startDelivery: vi.fn(),
  markDelivered: vi.fn(),
  refresh: vi.fn(),
}

describe('DriverDeliveriesPage', () => {
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

  it('muestra el nombre del comercio', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByTestId('driver-merchant-name')).toHaveTextContent('La Pizza')
  })

  it('muestra la sección "Nuevas" con pedidos asignados', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByRole('heading', { name: /Nuevas/i })).toBeInTheDocument()
    expect(screen.getByTestId('delivery-card')).toBeInTheDocument()
  })

  it('muestra la sección "En Camino" con pedidos en tránsito', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      inTransit: [createOrder({ status: 'on_the_way' })],
    })

    renderPage()

    expect(screen.getByRole('heading', { name: /En Camino/i })).toBeInTheDocument()
    expect(screen.getByTestId('delivery-card')).toBeInTheDocument()
  })

  it('muestra la sección "Historial" con pedidos entregados', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      delivered: [createOrder({ status: 'delivered' })],
    })

    renderPage()

    expect(screen.getByRole('heading', { name: /Historial/i })).toBeInTheDocument()
    expect(screen.getByTestId('delivery-card')).toBeInTheDocument()
  })

  it('muestra el nombre, dirección y teléfono del cliente en la tarjeta', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByText('María Pérez')).toBeInTheDocument()
    expect(screen.getByText('+584141234567')).toBeInTheDocument()
    expect(screen.getByText(/Av\. Principal 123/i)).toBeInTheDocument()
  })

  it('muestra el badge con el estado del pedido', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByText('Listo')).toBeInTheDocument()
  })

  it('muestra el total del pedido formateado', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByText(/120/)).toBeInTheDocument()
  })

  it('muestra el botón "Actualizar" y llama a refresh', async () => {
    const refresh = vi.fn()
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      refresh,
    })

    renderPage()

    screen.getByTestId('refresh-btn').click()

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled()
    })
  })

  it('muestra el estado de carga', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      loading: true,
    })

    renderPage()

    expect(screen.getByTestId('driver-loading')).toBeInTheDocument()
    expect(screen.getByText(/Cargando pedidos/)).toBeInTheDocument()
  })

  it('muestra el estado de error', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      error: 'Error al cargar',
    })

    renderPage()

    expect(screen.getByTestId('driver-error')).toBeInTheDocument()
    expect(screen.getByText('Error al cargar')).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay pedidos', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
    })

    renderPage()

    expect(screen.getByTestId('driver-no-orders')).toBeInTheDocument()
    expect(screen.getByText(/Sin entregas asignadas/)).toBeInTheDocument()
  })
})
