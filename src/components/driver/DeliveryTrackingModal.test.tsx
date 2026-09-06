import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../hooks/useGpsTracking', () => ({
  useGpsTracking: vi.fn().mockReturnValue({
    position: null,
    error: null,
    tracking: false,
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
  }),
}))

vi.mock('../../components/map/MapView', () => ({
  MapView: ({ markers, className }: { markers: Array<{ id: string; title: string }>; className?: string }) => (
    <div data-testid="map-view" className={className} data-markers={JSON.stringify(markers.map((m) => m.id))} />
  ),
}))

import { useGpsTracking } from '../../hooks/useGpsTracking'
import { DeliveryTrackingModal } from './DeliveryTrackingModal'

const today = new Date().toISOString()

const createOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-12345678-9abc-def0-1234-56789abcdef0',
  merchant_id: 'm-1',
  customer_id: 'c-1',
  driver_id: 'driver-1',
  type: 'delivery' as const,
  status: 'ready' as const,
  payment_method: 'cash' as const,
  payment_reference: null,
  payment_proof_url: null,
  total_amount: '120',
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

const defaultProps = {
  order: createOrder(),
  isOpen: true,
  onClose: vi.fn(),
  onStartTrip: vi.fn().mockResolvedValue(undefined),
  onConfirmDelivery: vi.fn().mockResolvedValue(undefined),
  actionLoading: false,
}

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(<DeliveryTrackingModal {...defaultProps} {...overrides} />)
}

describe('DeliveryTrackingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza el modal cuando isOpen es true', () => {
    renderModal()
    expect(screen.getByTestId('delivery-tracking-modal')).toBeInTheDocument()
  })

  it('muestra el número de pedido formateado', () => {
    renderModal({ order: createOrder({ id: 'abc12345-def0-1234' }) })
    expect(screen.getByText('#ABC12345')).toBeInTheDocument()
  })

  it('muestra el nombre del cliente', () => {
    renderModal()
    expect(screen.getByText('María Pérez')).toBeInTheDocument()
  })

  it('muestra la dirección de entrega', () => {
    renderModal()
    expect(screen.getByText(/Av\. Principal 123/i)).toBeInTheDocument()
  })

  it('muestra el botón de llamar al cliente', () => {
    renderModal()
    expect(screen.getByTestId('call-customer')).toHaveAttribute(
      'href',
      'tel:+584141234567',
    )
  })

  it('muestra el botón de Google Maps con la URL correcta', () => {
    renderModal()
    const mapsLink = screen.getByTestId('open-maps')
    expect(mapsLink).toHaveAttribute('target', '_blank')
    expect(mapsLink).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/search'),
    )
  })

  it('muestra el botón "Iniciar viaje" para pedidos asignados', () => {
    renderModal()
    expect(screen.getByTestId('start-trip')).toBeInTheDocument()
  })

  it('muestra el botón "Confirmar entrega" para pedidos en tránsito', () => {
    renderModal({ order: createOrder({ status: 'on_the_way' }) })
    expect(screen.getByTestId('confirm-delivery')).toBeInTheDocument()
  })

  it('muestra "Entrega completada" para pedidos entregados', () => {
    renderModal({ order: createOrder({ status: 'delivered' }) })
    expect(screen.getByText('Entrega completada')).toBeInTheDocument()
  })

  it('cierra el modal al pulsar el botón de cerrar', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    screen.getByTestId('modal-close').click()
    expect(onClose).toHaveBeenCalled()
  })

  it('llama a onStartTrip al pulsar "Iniciar viaje"', async () => {
    const onStartTrip = vi.fn().mockResolvedValue(undefined)
    renderModal({ onStartTrip })
    screen.getByTestId('start-trip').click()
    expect(onStartTrip).toHaveBeenCalledWith('order-12345678-9abc-def0-1234-56789abcdef0')
  })

  it('llama a onConfirmDelivery al pulsar "Confirmar entrega"', async () => {
    const onConfirmDelivery = vi.fn().mockResolvedValue(undefined)
    renderModal({
      order: createOrder({ status: 'on_the_way' }),
      onConfirmDelivery,
    })
    screen.getByTestId('confirm-delivery').click()
    expect(onConfirmDelivery).toHaveBeenCalledWith('order-12345678-9abc-def0-1234-56789abcdef0')
  })

  it('muestra el badge con el estado del pedido', () => {
    renderModal()
    expect(screen.getByText('Listo')).toBeInTheDocument()
  })

  it('muestra el resumen de productos', () => {
    renderModal()
    expect(screen.getByText(/producto/)).toBeInTheDocument()
  })

  it('inicia GPS tracking al abrir con estado on_the_way', () => {
    const startTracking = vi.fn()
    ;(useGpsTracking as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      position: null,
      error: null,
      tracking: false,
      startTracking,
      stopTracking: vi.fn(),
    })

    renderModal({ order: createOrder({ status: 'on_the_way' }) })

    expect(startTracking).toHaveBeenCalled()
  })

  it('muestra la posición GPS cuando está disponible', () => {
    ;(useGpsTracking as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      position: { lat: 10.4806, lng: -66.9036 },
      error: null,
      tracking: true,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    })

    renderModal({ order: createOrder({ status: 'on_the_way' }) })

    expect(screen.getByTestId('gps-active')).toBeInTheDocument()
    expect(screen.getByText(/Lat: 10\.48060/)).toBeInTheDocument()
  })

  it('muestra error de GPS cuando falla', () => {
    ;(useGpsTracking as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      position: null,
      error: 'GPS no disponible',
      tracking: false,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    })

    renderModal({ order: createOrder({ status: 'on_the_way' }) })

    expect(screen.getByTestId('gps-error')).toBeInTheDocument()
    expect(screen.getByText('GPS no disponible')).toBeInTheDocument()
  })

  it('no muestra botón de acción cuando actionLoading es true', () => {
    renderModal({ actionLoading: true })
    const startTrip = screen.getByTestId('start-trip')
    expect(startTrip).toBeDisabled()
  })
})
