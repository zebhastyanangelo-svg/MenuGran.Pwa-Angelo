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

  it('muestra tabs de navegación (Nuevas, En camino, Completadas)', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByTestId('tab-assigned')).toBeInTheDocument()
    expect(screen.getByTestId('tab-inTransit')).toBeInTheDocument()
    expect(screen.getByTestId('tab-delivered')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Nuevas/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /En camino/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Completadas/i })).toBeInTheDocument()
  })

  it('muestra contador de pedidos en cada tab', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder(), createOrder({ id: 'order-2' })],
      inTransit: [createOrder({ id: 'order-3', status: 'on_the_way' })],
      delivered: [createOrder({ id: 'order-4', status: 'delivered' }), createOrder({ id: 'order-5', status: 'delivered' }), createOrder({ id: 'order-6', status: 'delivered' })],
    })

    renderPage()

    expect(screen.getByTestId('tab-assigned')).toHaveTextContent('2')
    expect(screen.getByTestId('tab-inTransit')).toHaveTextContent('1')
    expect(screen.getByTestId('tab-delivered')).toHaveTextContent('3')
  })

  it('muestra la sección "Nuevas" con pedidos asignados por defecto', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByTestId('orders-panel-assigned')).toBeInTheDocument()
    expect(screen.getByTestId('delivery-card')).toBeInTheDocument()
  })

  it('permite cambiar a tab "En camino" y muestra pedidos en tránsito', async () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
      inTransit: [createOrder({ id: 'order-2', status: 'on_the_way' })],
    })

    renderPage()

    // Click on "En camino" tab
    screen.getByTestId('tab-inTransit').click()

    await waitFor(() => {
      expect(screen.getByTestId('orders-panel-inTransit')).toBeInTheDocument()
    })
    expect(screen.getByTestId('delivery-card')).toBeInTheDocument()
  })

  it('permite cambiar a tab "Completadas" y muestra historial', async () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      delivered: [createOrder({ id: 'order-2', status: 'delivered' })],
    })

    renderPage()

    screen.getByTestId('tab-delivered').click()

    await waitFor(() => {
      expect(screen.getByTestId('orders-panel-delivered')).toBeInTheDocument()
    })
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

  it('muestra botones de Maps y Waze en cada tarjeta', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByTestId('open-maps-order-1')).toBeInTheDocument()
    expect(screen.getByTestId('open-waze-order-1')).toBeInTheDocument()
    expect(screen.getByText('Maps')).toBeInTheDocument()
    expect(screen.getByText('Waze')).toBeInTheDocument()
  })

  it('muestra botón "Iniciar viaje" para pedidos asignados (ready)', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByTestId('start-trip-order-1')).toBeInTheDocument()
    expect(screen.getByText('Iniciar viaje')).toBeInTheDocument()
  })

  it('muestra botón "Marcar como entregado" para pedidos en camino', async () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      inTransit: [createOrder({ id: 'order-2', status: 'on_the_way' })],
    })

    renderPage()

    screen.getByTestId('tab-inTransit').click()

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delivery-order-2')).toBeInTheDocument()
    })
    expect(screen.getByText('Marcar como entregado')).toBeInTheDocument()
  })

  it('muestra "Entrega completada" para pedidos entregados', async () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      delivered: [createOrder({ id: 'order-2', status: 'delivered' })],
    })

    renderPage()

    screen.getByTestId('tab-delivered').click()

    await waitFor(() => {
      expect(screen.getByText(/Entrega completada/i)).toBeInTheDocument()
    })
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

  it('muestra el estado vacío cuando no hay pedidos en la pestaña activa', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
    })

    renderPage()

    expect(screen.getByTestId('driver-no-orders')).toBeInTheDocument()
    expect(screen.getByText(/Sin entregas asignadas/)).toBeInTheDocument()
  })

  it('llama a takeOrder al hacer clic en "Iniciar viaje"', async () => {
    const takeOrder = vi.fn()
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
      takeOrder,
    })

    renderPage()

    // Find and click the "Iniciar viaje" button
    const startButton = screen.getByTestId('start-trip-order-1')
    startButton.click()

    await waitFor(() => {
      expect(takeOrder).toHaveBeenCalledWith('order-1')
    })
  })

  it('llama a markDelivered al hacer clic en "Marcar como entregado"', async () => {
    const markDelivered = vi.fn()
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      inTransit: [createOrder({ id: 'order-2', status: 'on_the_way' })],
      markDelivered,
    })

    renderPage()

    screen.getByTestId('tab-inTransit').click()

    await waitFor(() => {
      const confirmButton = screen.getByTestId('confirm-delivery-order-2')
      confirmButton.click()
    })

    await waitFor(() => {
      expect(markDelivered).toHaveBeenCalledWith('order-2')
    })
  })
})