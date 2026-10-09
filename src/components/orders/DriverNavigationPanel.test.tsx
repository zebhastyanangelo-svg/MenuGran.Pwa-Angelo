import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DriverNavigationPanel } from './DriverNavigationPanel';

vi.mock('../map/MapView', () => ({
  MapView: ({
    markers,
    followUserLocation,
    className,
  }: {
    markers: Array<{ id: string }>;
    followUserLocation?: boolean;
    className?: string;
  }) => (
    <div
      data-testid="map-view"
      className={className}
      data-follow={String(followUserLocation ?? false)}
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
    driverName: 'Carlos Pérez',
    driverPhone: '+584121234567',
    driverAvatarUrl: null,
    orderCode: '#ABC12345',
    statusLabel: 'En camino',
    canConfirmDelivery: true,
    isConfirming: false,
    onConfirmDelivery: vi.fn(),
    ...overrides,
  };
  return render(<DriverNavigationPanel {...props} />);
}

describe('DriverNavigationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchRouteDetailsMock.mockResolvedValue(mockRouteDetails);
  });

  it('renderiza el mapa en modo seguir con destino y repartidor', () => {
    renderPanel();

    const map = screen.getByTestId('map-view');
    expect(map.getAttribute('data-follow')).toBe('true');
    const markers = map.getAttribute('data-markers') ?? '';
    expect(markers).toContain('destination');
    expect(markers).toContain('driver');
  });

  it('muestra el HUD flotante completo: instrucción, controles y tarjeta', async () => {
    renderPanel();
    await screen.findByTestId('navigation-instruction-bar');

    expect(screen.getByTestId('navigation-side-controls')).toBeInTheDocument();
    expect(screen.getByTestId('center-button')).toHaveTextContent('Centrar');

    const instruction = screen.getByTestId('navigation-instruction-bar');
    expect(within(instruction).getByText('Gira a la derecha')).toBeInTheDocument();
    expect(within(instruction).getByTestId('instruction-distance')).toHaveTextContent('290 m');
  });

  it('muestra la tarjeta del repartidor con ETA, verificación y código', async () => {
    renderPanel();
    await screen.findByTestId('navigation-person-card');

    const card = screen.getByTestId('navigation-person-card');
    expect(within(card).getByTestId('navigation-eta').textContent).toContain('14 min');
    expect(within(card).getByText('REPARTIDOR:')).toBeInTheDocument();
    expect(within(card).getByText('Carlos Pérez')).toBeInTheDocument();
    expect(within(card).getByTestId('person-verified-badge')).toBeInTheDocument();
    expect(within(card).getByTestId('person-call-button')).toHaveAttribute(
      'href',
      'tel:+584121234567',
    );
    expect(
      within(card).getByText(/Pedido #ABC12345 · En camino/),
    ).toBeInTheDocument();
  });

  it('muestra el botón de confirmación en la tarjeta y dispara la acción', async () => {
    const user = userEvent.setup();
    const onConfirmDelivery = vi.fn();
    renderPanel({ onConfirmDelivery });

    const confirmButton = await screen.findByTestId('confirm-delivery');
    expect(confirmButton).toHaveTextContent('Confirmar pedido recibido');
    await user.click(confirmButton);
    expect(onConfirmDelivery).toHaveBeenCalledTimes(1);
  });

  it('muestra la barra de estado cuando el cliente no puede confirmar', () => {
    renderPanel({ canConfirmDelivery: false });

    expect(screen.queryByTestId('confirm-delivery')).not.toBeInTheDocument();
    expect(screen.getByText(/repartidor está en camino/i)).toBeInTheDocument();
  });

  it('centra y reorienta sin estallar mientras no hay mapa listo', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByTestId('reorient-button'));
    await user.click(screen.getByTestId('center-button'));

    // Sin posición del repartidor las acciones degradan sin error.
    expect(screen.getByTestId('center-button')).toBeInTheDocument();
  });

  it('espera la ubicación del repartidor mostrando solo el destino', () => {
    renderPanel({ driverLocation: null });

    const map = screen.getByTestId('map-view');
    const markers = map.getAttribute('data-markers') ?? '';
    expect(markers).toContain('destination');
    expect(markers).not.toContain('driver');
    expect(fetchRouteDetailsMock).not.toHaveBeenCalled();
  });

  it('alterna el silencio de la guía de voz', async () => {
    const user = userEvent.setup();
    renderPanel();

    const muteButton = screen.getByTestId('toggle-mute-button');
    expect(muteButton).toHaveAttribute('aria-pressed', 'true');
    await user.click(muteButton);
    expect(muteButton).toHaveAttribute('aria-pressed', 'false');
  });
});
