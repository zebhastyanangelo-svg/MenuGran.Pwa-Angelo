import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

const toastMocks = vi.hoisted(() => ({ showToast: vi.fn() }))

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useDriverDeliveries', () => ({
  useDriverDeliveries: vi.fn(),
}))
vi.mock('../../components/pwa/useNotificationToast', () => ({
  useNotificationToast: () => toastMocks,
}))
vi.mock('../../components/driver/DeliveryTrackingModal', () => ({
  DeliveryTrackingModal: ({ order, isOpen }: { order: { id: string; status: string }; isOpen: boolean }) =>
    isOpen ? <div data-testid="delivery-tracking-modal" data-status={order.status} /> : null,
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
  delivery_address: 'Av. Principal 123, Caracas',
  delivery_address_notes: 'Av. Principal 123, Caracas',
  latitude: null,
  longitude: null,
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

  it('muestra botón "En camino" para pedidos asignados (ready)', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.getByTestId('start-route-order-1')).toBeInTheDocument()
    expect(screen.getByTestId('start-route-order-1')).toHaveTextContent('En camino')
  })

  it('no muestra botones de mapas externos (Google Maps / Waze)', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
    })

    renderPage()

    expect(screen.queryByTestId('open-maps-order-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('open-waze-order-1')).not.toBeInTheDocument()
    expect(screen.queryByText('Maps')).not.toBeInTheDocument()
    expect(screen.queryByText('Waze')).not.toBeInTheDocument()
  })

  it('no muestra botón "Marcar como entregado" en pedidos en camino', async () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      inTransit: [createOrder({ id: 'order-2', status: 'on_the_way' })],
    })

    renderPage()

    screen.getByTestId('tab-inTransit').click()

    await waitFor(() => {
      expect(screen.getByTestId('start-route-order-2')).toBeInTheDocument()
    })
    expect(screen.queryByText('Marcar como entregado')).not.toBeInTheDocument()
    expect(screen.getByText('Ver ruta en mapa')).toBeInTheDocument()
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

  it('muestra "En camino" para pedidos asignados en preparación', () => {
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder({ status: 'confirmed' })],
    })

    renderPage()

    expect(screen.getByTestId('start-route-order-1')).toBeInTheDocument()
  })

  it('marca la orden "on_the_way" y abre el mapa interno al pulsar "En camino"', async () => {
    const takeOrder = vi.fn().mockResolvedValue(undefined)
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      assigned: [createOrder()],
      takeOrder,
    })

    renderPage()

    screen.getByTestId('start-route-order-1').click()

    await waitFor(() => {
      expect(takeOrder).toHaveBeenCalledWith('order-1')
      expect(screen.getByTestId('delivery-tracking-modal')).toBeInTheDocument()
    })
    expect(screen.getByTestId('delivery-tracking-modal')).toHaveAttribute(
      'data-status',
      'on_the_way',
    )
  })

  it('abre el mapa interno sin cambiar estado para pedidos ya en camino', async () => {
    const takeOrder = vi.fn().mockResolvedValue(undefined)
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      inTransit: [createOrder({ id: 'order-2', status: 'on_the_way' })],
      takeOrder,
    })

    renderPage()

    screen.getByTestId('tab-inTransit').click()

    await waitFor(() => {
      expect(screen.getByTestId('start-route-order-2')).toBeInTheDocument()
    })

    screen.getByTestId('start-route-order-2').click()

    await waitFor(() => {
      expect(screen.getByTestId('delivery-tracking-modal')).toBeInTheDocument()
    })
    expect(takeOrder).not.toHaveBeenCalled()
  })

  it('cierra el mapa, mueve a "Completadas" y avisa cuando el cliente confirma la entrega', async () => {
    toastMocks.showToast.mockClear()
    const hookReturn = {
      ...defaultHookReturn,
      inTransit: [createOrder({ id: 'order-2', status: 'on_the_way' })],
      delivered: [] as ReturnType<typeof createOrder>[],
    }
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({ ...hookReturn, inTransit: [...hookReturn.inTransit], delivered: [...hookReturn.delivered] }),
    )

    const { rerender } = renderPage()

    screen.getByTestId('tab-inTransit').click()
    await waitFor(() => {
      expect(screen.getByTestId('start-route-order-2')).toBeInTheDocument()
    })
    screen.getByTestId('start-route-order-2').click()

    await waitFor(() => {
      expect(screen.getByTestId('delivery-tracking-modal')).toBeInTheDocument()
    })

    // El cliente confirma la recepción: la orden pasa a delivered
    hookReturn.inTransit = []
    hookReturn.delivered = [createOrder({ id: 'order-2', status: 'delivered' })]
    rerender(
      <BrowserRouter>
        <DriverDeliveriesPage />
      </BrowserRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('delivery-tracking-modal')).not.toBeInTheDocument()
      expect(screen.getByTestId('orders-panel-delivered')).toBeInTheDocument()
    })
    expect(toastMocks.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '¡El cliente ha confirmado la recepción del pedido!',
        variant: 'success',
      }),
    )
    expect(screen.getByText(/Entrega completada/i)).toBeInTheDocument()
  })

  it('no llama a markDelivered (la entrega solo la confirma el cliente)', async () => {
    const markDelivered = vi.fn()
    ;(useDriverDeliveries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultHookReturn,
      inTransit: [createOrder({ id: 'order-2', status: 'on_the_way' })],
      markDelivered,
    })

    renderPage()

    screen.getByTestId('tab-inTransit').click()

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delivery-order-2')).not.toBeInTheDocument()
    })
    expect(markDelivered).not.toHaveBeenCalled()
  })
})