import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationPicker } from './LocationPicker';

vi.mock('leaflet', () => {
  const mockMap = {
    setView: vi.fn(),
    flyTo: vi.fn(),
    eachLayer: vi.fn(),
    remove: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  const markerFn = vi.fn((_latlng: unknown, _options?: unknown) => ({
    addTo: vi.fn(),
    bindPopup: vi.fn(),
    setLatLng: vi.fn(),
    remove: vi.fn(),
  }));

  const iconFn = vi.fn((_options: unknown) => ({ _options }));

  return {
    default: {
      map: vi.fn(() => mockMap),
      marker: markerFn,
      icon: iconFn,
    },
  };
});

vi.mock('leaflet/dist/leaflet.css', () => ({}));

const mockToast = {
  showToast: vi.fn(),
  hideToast: vi.fn(),
  toasts: [],
};

vi.mock('../../hooks/useToast', () => ({
  useToast: () => mockToast,
}));

const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

const originalGeolocation = navigator.geolocation;

describe('LocationPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
      writable: true,
    });
  });

  it('renderiza el contenedor del mapa y el botón de ubicación', () => {
    const onLocationChange = vi.fn();
    const { container } = render(
      <LocationPicker onLocationChange={onLocationChange} />,
    );

    const mapDiv = container.querySelector('.relative > div.h-64.w-full');
    expect(mapDiv).toBeInTheDocument();

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Usar mi ubicación');
  });

  it('no llama onLocationChange al montar sin interacción', () => {
    const onLocationChange = vi.fn();
    render(<LocationPicker onLocationChange={onLocationChange} />);
    expect(onLocationChange).not.toHaveBeenCalled();
  });

  it('obtiene la ubicación, centra el mapa con flyTo y actualiza el marcador', async () => {
    const onLocationChange = vi.fn();
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 19.4326, longitude: -99.1332 },
      });
    });

    render(<LocationPicker onLocationChange={onLocationChange} />);

    fireEvent.click(screen.getByText('Usar mi ubicación'));

    await waitFor(() => {
      expect(onLocationChange).toHaveBeenCalledWith({ x: -99.1332, y: 19.4326 });
    });

    const mapModule = (await import('leaflet')).default as unknown as {
      map: ReturnType<typeof vi.fn>;
    };
    const mapInstance = mapModule.map.mock.results[0]?.value as {
      flyTo: ReturnType<typeof vi.fn>;
    };
    expect(mapInstance).toBeDefined();
    expect(mapInstance.flyTo).toHaveBeenCalledWith(
      [19.4326, -99.1332],
      16,
    );

    expect(mockToast.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Ubicación actualizada' }),
    );
  });

  it('muestra spinner y cambia el texto mientras busca', async () => {
    const onLocationChange = vi.fn();
    let resolveGeolocation: (pos: GeolocationPosition) => void;
    const pendingPromise = new Promise<GeolocationPosition>((resolve) => {
      resolveGeolocation = resolve;
    });
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      pendingPromise.then(success);
    });

    render(<LocationPicker onLocationChange={onLocationChange} />);

    fireEvent.click(screen.getByText('Usar mi ubicación'));

    expect(screen.getByLabelText('Obteniendo ubicación')).toBeInTheDocument();
    expect(screen.getByText('Obteniendo ubicación...')).toBeInTheDocument();

    resolveGeolocation!({
      coords: { latitude: 19.4326, longitude: -99.1332 },
    } as GeolocationPosition);

    await waitFor(() => {
      expect(screen.getByText('Usar mi ubicación')).toBeInTheDocument();
    });
  });

  it('maneja el caso de permiso denegado con un toast de error', async () => {
    const onLocationChange = vi.fn();
    const permissionError: GeolocationPositionError = {
      code: 1,
      message: 'User denied Geolocation',
      name: 'GeolocationPositionError',
    } as unknown as GeolocationPositionError;
    mockGeolocation.getCurrentPosition.mockImplementation((_success, error) => {
      error(permissionError);
    });

    render(<LocationPicker onLocationChange={onLocationChange} />);

    fireEvent.click(screen.getByText('Usar mi ubicación'));

    await waitFor(() => {
      expect(onLocationChange).not.toHaveBeenCalled();
    });

    expect(mockToast.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        title: 'Error de geolocalización',
      }),
    );
  });

  it('maneja el caso de timeout con un toast de error', async () => {
    const onLocationChange = vi.fn();
    const timeoutError: GeolocationPositionError = {
      code: 3,
      message: 'Geolocation timeout',
      name: 'GeolocationPositionError',
    } as unknown as GeolocationPositionError;
    mockGeolocation.getCurrentPosition.mockImplementation((_success, error) => {
      error(timeoutError);
    });

    render(<LocationPicker onLocationChange={onLocationChange} />);

    fireEvent.click(screen.getByText('Usar mi ubicación'));

    await waitFor(() => {
      expect(onLocationChange).not.toHaveBeenCalled();
    });

    expect(mockToast.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        title: 'Error de geolocalización',
      }),
    );
  });

  it('maneja el caso de navegador sin soporte de geolocalización', async () => {
    const onLocationChange = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    render(<LocationPicker onLocationChange={onLocationChange} />);

    fireEvent.click(screen.getByText('Usar mi ubicación'));

    await waitFor(() => {
      expect(mockToast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          title: 'Error de geolocalización',
        }),
      );
    });

    expect(onLocationChange).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });
  });

  it('deshabilita el botón mientras se localiza', async () => {
    const onLocationChange = vi.fn();
    let resolveGeolocation: (pos: GeolocationPosition) => void;
    const pendingPromise = new Promise<GeolocationPosition>((resolve) => {
      resolveGeolocation = resolve;
    });
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      pendingPromise.then(success);
    });

    render(<LocationPicker onLocationChange={onLocationChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button).toBeDisabled();

    resolveGeolocation!({
      coords: { latitude: 19.4326, longitude: -99.1332 },
    } as GeolocationPosition);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
