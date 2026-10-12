import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DeliveryMap,
  buildRiderIcon,
  calculateHeadingDegrees,
} from './DeliveryMap';

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((options: { html?: string }) => ({ kind: 'divIcon', html: options?.html ?? '' })),
  },
}));

vi.mock('./MapView', () => ({
  MapView: ({
    markers,
    center,
    userLocation,
    userLocationIcon,
    userLocationTitle,
    followUserLocation,
    className,
  }: {
    markers: Array<{ id: string }>;
    center?: [number, number];
    userLocation?: [number, number] | null;
    userLocationIcon?: unknown;
    userLocationTitle?: string;
    followUserLocation?: boolean;
    className?: string;
  }) => (
    <div
      data-testid="map-view-stub"
      className={className}
      data-markers={JSON.stringify(markers.map((marker) => marker.id))}
      data-center={center === undefined ? '' : JSON.stringify(center)}
      data-rider={userLocation ? JSON.stringify(userLocation) : ''}
      data-follow={String(followUserLocation ?? false)}
      data-rider-title={userLocationTitle ?? ''}
      data-has-rider-icon={String(userLocationIcon !== undefined)}
    />
  ),
}));

describe('calculateHeadingDegrees', () => {
  it('calcula el rumbo desde el norte con atan2(dLon, dLat)', () => {
    // Hacia el norte (dLat > 0): 0°.
    expect(calculateHeadingDegrees([10.0, -66.9], [10.1, -66.9])).toBe(0);
    // Hacia el este (dLng > 0): 90°.
    expect(calculateHeadingDegrees([10.1, -66.9], [10.1, -66.8])).toBe(90);
    // Hacia el sur: 180°.
    expect(calculateHeadingDegrees([10.1, -66.9], [10.0, -66.9])).toBe(180);
    // Hacia el oeste: 270°.
    expect(calculateHeadingDegrees([10.1, -66.9], [10.1, -67.0])).toBe(270);
    // Diagonal suroeste: 225°.
    expect(calculateHeadingDegrees([10.1, -66.9], [10.0, -67.0])).toBeCloseTo(225, 5);
  });

  it('devuelve null sin posición previa o sin movimiento real', () => {
    expect(calculateHeadingDegrees(null, [10.1, -66.9])).toBeNull();
    expect(calculateHeadingDegrees([10.1, -66.9], null)).toBeNull();
    expect(calculateHeadingDegrees([10.1, -66.9], [10.1, -66.9])).toBeNull();
  });
});

describe('buildRiderIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rota la moto hacia el rumbo del movimiento', () => {
    const icon = buildRiderIcon(90) as unknown as { html: string };
    expect(icon.html).toContain('rotate(90.0deg)');
    expect(icon.html).toContain('fa-motorcycle');
  });

  it('sin rumbo la moto queda derecha, sin rotación', () => {
    const icon = buildRiderIcon(null) as unknown as { html: string };
    expect(icon.html).not.toContain('rotate(');
    expect(icon.html).toContain('transition');
  });
});

describe('DeliveryMap', () => {
  const destinationMarker = {
    id: 'destination',
    position: [10.5, -66.9] as [number, number],
    title: 'Destino',
  };

  it('pasa el repartidor como ubicación rastreada con icono de moto y follow', () => {
    render(
      <DeliveryMap
        riderPosition={[10.4806, -66.9036]}
        markers={[destinationMarker]}
        followRider
      />,
    );

    const stub = screen.getByTestId('map-view-stub');
    expect(stub.getAttribute('data-rider')).toBe('[10.4806,-66.9036]');
    expect(stub.getAttribute('data-follow')).toBe('true');
    expect(stub.getAttribute('data-has-rider-icon')).toBe('true');
    expect(stub.getAttribute('data-rider-title')).toBe('Repartidor');
    expect(stub.getAttribute('data-markers')).toBe('["destination"]');
    // Con seguimiento, el centro acompaña al repartidor.
    expect(stub.getAttribute('data-center')).toBe('[10.4806,-66.9036]');
  });

  it('expone el rumbo calculado entre la posición previa y la actual', () => {
    render(
      <DeliveryMap
        riderPosition={[10.4806, -66.9036]}
        previousRiderPosition={[10.4806, -66.9136]}
        followRider={false}
      />,
    );

    const map = screen.getByTestId('delivery-map');
    // dLng positivo puro → rumbo 90° (este).
    expect(map.getAttribute('data-heading')).toBe('90');
    expect(map.getAttribute('data-follow')).toBe('false');
    // Sin seguimiento la cámara queda anclada al primer marcador.
    const stub = screen.getByTestId('map-view-stub');
    expect(stub.getAttribute('data-center')).toBe('');
  });

  it('sin posición previa el rumbo queda vacío', () => {
    render(<DeliveryMap riderPosition={[10.4806, -66.9036]} />);

    expect(screen.getByTestId('delivery-map').getAttribute('data-heading')).toBe('');
  });
});
