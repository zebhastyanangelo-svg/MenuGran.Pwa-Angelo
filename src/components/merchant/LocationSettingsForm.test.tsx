import { describe, expect, it, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { LocationSettingsForm } from './LocationSettingsForm';
import type { GeoPoint } from '../../types/database';

vi.mock('leaflet', () => {
  const mockMap = {
    setView: vi.fn(),
    flyTo: vi.fn(),
    remove: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    invalidateSize: vi.fn(),
  };

  const markerFn = vi.fn(() => markerResult);
  const markerResult = {
    addTo: vi.fn(() => markerResult),
    setLatLng: vi.fn(),
    remove: vi.fn(),
  };

  return {
    default: {
      map: vi.fn(() => mockMap),
      marker: markerFn,
      icon: vi.fn((options: unknown) => ({ options })),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    },
  };
});

vi.mock('leaflet/dist/leaflet.css', () => ({}));

const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

const originalGeolocation = navigator.geolocation;

interface HarnessProps {
  initialLocation?: GeoPoint | null;
  onLocationChange?: (location: GeoPoint | null) => void;
}

function Harness({ initialLocation = null, onLocationChange }: HarnessProps) {
  const [location, setLocation] = useState<GeoPoint | null>(initialLocation);
  const handleChange = onLocationChange ?? setLocation;
  return (
    <LocationSettingsForm
      location={location}
      onLocationChange={(point) => {
        setLocation(point);
        handleChange(point);
      }}
      address="Frente a la plaza"
      onAddressChange={vi.fn()}
      zone=""
      onZoneChange={vi.fn()}
    />
  );
}

describe('LocationSettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });
  });

  afterEach(cleanup);

  afterAll(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
      writable: true,
    });
  });

  it('renderiza el botón destacado de GPS, el mapa y los campos opcionales', () => {
    render(<Harness />);

    expect(
      screen.getByRole('button', { name: /Usar mi ubicación actual/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location-map-preview')).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección \/ Referencia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Zona/i)).toBeInTheDocument();
  });

  it('muestra estado de carga mientras obtiene la ubicación GPS', async () => {
    let resolvePosition: ((position: unknown) => void) | undefined;
    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: (position: unknown) => void) => {
        resolvePosition = success;
      },
    );

    render(<Harness />);

    fireEvent.click(screen.getByTestId('use-current-location'));

    const loadingButton = await screen.findByRole('button', {
      name: /Obteniendo ubicación/i,
    });
    expect(loadingButton).toBeDisabled();

    resolvePosition?.({ coords: { latitude: 10.4806, longitude: -66.9036 } });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Usar mi ubicación actual/i }),
      ).toBeEnabled();
    });
  });

  it('notifica las coordenadas GPS capturadas al formulario', async () => {
    const onLocationChange = vi.fn();
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 10.4806, longitude: -66.9036 } });
    });

    render(<Harness onLocationChange={onLocationChange} />);

    fireEvent.click(screen.getByTestId('use-current-location'));

    await waitFor(() => {
      expect(onLocationChange).toHaveBeenCalledWith({
        x: -66.9036,
        y: 10.4806,
      });
    });
  });

  it('muestra las coordenadas capturadas para que el comerciante confirme', async () => {
    render(<Harness initialLocation={{ x: -66.9036, y: 10.4806 }} />);

    expect(screen.getByTestId('captured-coordinates')).toHaveTextContent(
      'Ubicación capturada',
    );
    expect(screen.getByTestId('latitude')).toHaveTextContent('10.480600');
    expect(screen.getByTestId('longitude')).toHaveTextContent('-66.903600');
  });

  it('centra el mapa en el punto capturado con flyTo', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 10.4806, longitude: -66.9036 } });
    });

    render(<Harness />);

    fireEvent.click(screen.getByTestId('use-current-location'));

    await waitFor(async () => {
      const mapModule = (await import('leaflet')).default as unknown as {
        map: ReturnType<typeof vi.fn>;
      };
      const mapInstance = mapModule.map.mock.results[0]?.value as {
        flyTo: ReturnType<typeof vi.fn>;
      };
      expect(mapInstance.flyTo).toHaveBeenCalledWith([10.4806, -66.9036], 16);
    });
  });

  it('muestra un error amigable cuando se deniega el permiso del GPS', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation(
      (_success: unknown, failure: (error: unknown) => void) => {
        failure(Object.assign(new Error('denied'), { code: 1 }));
      },
    );

    render(<Harness />);

    fireEvent.click(screen.getByTestId('use-current-location'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Permiso de ubicación denegado',
    );
  });

  it('muestra un error amigable cuando el dispositivo no soporta geolocalización', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    render(<Harness />);

    fireEvent.click(screen.getByTestId('use-current-location'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no soporta geolocalización',
    );
  });
});
