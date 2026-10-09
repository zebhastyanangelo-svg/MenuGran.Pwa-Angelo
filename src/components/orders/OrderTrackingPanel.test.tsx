import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderTrackingPanel } from './OrderTrackingPanel';

vi.mock('../map/MapView', () => ({
  MapView: ({
    markers,
    followUserLocation,
    routeRequest,
  }: {
    markers: Array<{ id: string }>;
    followUserLocation?: boolean;
    routeRequest?: unknown;
  }) => (
    <div
      data-testid="map-view"
      data-follow={String(followUserLocation ?? false)}
      data-has-route-request={String(Boolean(routeRequest))}
      data-markers={JSON.stringify(markers.map((marker) => marker.id))}
    />
  ),
}));

const mockRouteDetails = {
  coordinates: [[10.48, -66.9] as [number, number], [10.5, -66.92] as [number, number]],
  durationSeconds: 840,
  distanceMeters: 6632,
  steps: [
    { maneuver: { type: 'turn', modifier: 'right' }, name: 'Calle 8', distanceMeters: 290 },
  ],
};

const fetchRouteDetailsMock = vi.fn().mockResolvedValue(mockRouteDetails);

vi.mock('../../utils/osrmRoute', () => ({
  fetchOsrmRouteDetails: (...args: unknown[]) => fetchRouteDetailsMock(...args),
}));

function renderPanel(overrides: Record<string, unknown> = {}) {
  const props = {
    driverLocation: { x: -66.9, y: 10.48 },
    destination: { x: -66.92, y: 10.5 },
    merchantPoint: { x: -66.88, y: 10.46 },
    driverName: 'Carlos Pérez',
    driverPhone: '+584121234567',
    driverAvatarUrl: null,
    orderCode: '#ABC12345',
    statusLabel: 'En camino',
    canConfirmDelivery: true,
    isConfirming: false,
    onConfirmDelivery: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return render(<OrderTrackingPanel {...props} />);
}

describe('OrderTrackingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchRouteDetailsMock.mockResolvedValue(mockRouteDetails);
  });

  it('muestra el mapa panorámico con comercio, destino y repartidor sin modo seguir', () => {
    renderPanel();

    const map = screen.getByTestId('map-view');
    expect(map.getAttribute('data-follow')).toBe('false');
    const markers = map.getAttribute('data-markers') ?? '';
    expect(markers).toContain('merchant');
    expect(markers).toContain('destination');
    expect(markers).toContain('driver');
    expect(map.getAttribute('data-has-route-request')).toBe('true');
  });

  it('no renderiza el HUD de navegación paso a paso del repartidor', () => {
    renderPanel();

    expect(screen.queryByTestId('navigation-instruction-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigation-side-controls')).not.toBeInTheDocument();
  });

  it('mantiene la tarjeta colapsada por defecto con el código de entrega visible', () => {
    renderPanel();

    expect(screen.getByTestId('tracking-card')).toBeInTheDocument();
    expect(screen.queryByTestId('tracking-card-details')).not.toBeInTheDocument();
    expect(screen.getByTestId('tracking-delivery-code')).toHaveTextContent('#ABC12345');
  });

  it('calcula la ETA con la ruta del repartidor', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('tracking-eta')).toHaveTextContent('14 min');
    });
  });

  it('al expandir muestra los datos del repartidor y confirma la entrega', async () => {
    const user = userEvent.setup();
    const onConfirmDelivery = vi.fn();
    renderPanel({ onConfirmDelivery });

    await user.click(screen.getByTestId('tracking-card-toggle'));

    expect(screen.getByTestId('tracking-card-details')).toBeInTheDocument();
    expect(screen.getByText('Repartidor')).toBeInTheDocument();
    expect(screen.getByTestId('tracking-driver-verified')).toBeInTheDocument();
    expect(screen.getByTestId('tracking-driver-call')).toHaveAttribute(
      'href',
      'tel:+584121234567',
    );

    const confirmButton = screen.getByTestId('confirm-delivery');
    expect(confirmButton).toHaveTextContent('Confirmar pedido recibido');
    await user.click(confirmButton);
    expect(onConfirmDelivery).toHaveBeenCalledTimes(1);
  });

  it('minimiza la tarjeta con la X y permite volver a mostrarla', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByTestId('minimize-tracking-card'));
    expect(screen.queryByTestId('tracking-card')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('restore-tracking-card'));
    expect(screen.getByTestId('tracking-card')).toBeInTheDocument();
  });

  it('cierra el mapa panorámico con el botón de cerrar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPanel({ onClose });

    await user.click(screen.getByTestId('close-tracking-map'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('muestra la espera y omite el repartidor si aún no hay ubicación', () => {
    renderPanel({ driverLocation: null });

    const map = screen.getByTestId('map-view');
    expect(map.getAttribute('data-markers') ?? '').not.toContain('driver');
    expect(screen.getByTestId('tracking-eta')).toHaveTextContent('Esperando al repartidor');
    expect(fetchRouteDetailsMock).not.toHaveBeenCalled();
  });

  it('omite la ruta completa y el marcador del comercio sin ubicación del local', () => {
    renderPanel({ merchantPoint: null });

    const map = screen.getByTestId('map-view');
    expect(map.getAttribute('data-has-route-request')).toBe('false');
    expect(map.getAttribute('data-markers') ?? '').not.toContain('merchant');
  });

  it('muestra la barra de estado cuando el cliente no puede confirmar', async () => {
    const user = userEvent.setup();
    renderPanel({ canConfirmDelivery: false });

    await user.click(screen.getByTestId('tracking-card-toggle'));
    expect(screen.queryByTestId('confirm-delivery')).not.toBeInTheDocument();
    expect(screen.getByText(/repartidor está en camino/i)).toBeInTheDocument();
  });

  it('centra el recorrido sin estallar cuando el mapa todavía no está listo', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByTestId('recenter-tracking'));
    expect(screen.getByTestId('recenter-tracking')).toBeInTheDocument();
  });
});
