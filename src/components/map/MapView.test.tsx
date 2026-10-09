import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { MerchantRow } from '../../types/database';
import {
  MapView,
  MerchantMapView,
} from './MapView';
import { fetchOsrmRoute, fetchOsrmRouteDetails } from '../../utils/osrmRoute';
import { merchantsByDistance } from '../../utils/distance';

// Mock ResizeObserver for tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('leaflet', () => {
  const layers: Record<string, unknown[]> = {};
  const instanceMap: Record<string, unknown[]> = {};

  const chainableLayer = () => ({
    addTo: vi.fn().mockReturnThis(),
    removeFrom: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    setLatLng: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
  });

  const mockMap = {
    setView: vi.fn(),
    eachLayer: vi.fn((cb: (layer: unknown) => void) => {
      const all = Object.values(layers).flat();
      all.forEach(cb);
    }),
    remove: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    invalidateSize: vi.fn(),
    fitBounds: vi.fn(),
  };

  const markerFn = vi.fn((_latlng: unknown, _options?: unknown) => chainableLayer());

  const circleMarkerFn = vi.fn((_latlng: unknown, _options?: unknown) => chainableLayer());

  const iconFn = vi.fn((_options: unknown) => ({ _options }));

  const latLngBoundsFn = vi.fn(() => ({
    extend: vi.fn().mockReturnThis(),
  }));

  return {
    default: {
      map: vi.fn(() => mockMap),
      marker: markerFn,
      circleMarker: circleMarkerFn,
      polyline: vi.fn(() => chainableLayer()),
      tileLayer: vi.fn(() => chainableLayer()),
      icon: iconFn,
      divIcon: vi.fn(() => ({})),
      latLngBounds: latLngBoundsFn,
      Marker: class {},
      CircleMarker: class {},
      Polyline: class {},
    },
    __layers: layers,
    __instanceMap: instanceMap,
    __mockMap: mockMap,
  };
});

vi.mock('leaflet/dist/leaflet.css', () => ({}));

describe('MapView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el contenedor del mapa', () => {
    render(<MapView markers={[]} />);
    const mapContainer = document.querySelector('.h-64.w-full');
    expect(mapContainer).toBeInTheDocument();
  });

  it('renderiza sin marcadores sin errores', () => {
    render(<MapView markers={[]} center={[19.43, -99.13]} zoom={10} />);
    expect(document.querySelector('.h-64.w-full')).toBeInTheDocument();
  });

  it('renderiza con ruta polilínea sin errores', () => {
    render(
      <MapView
        markers={[]}
        center={[19.43, -99.13]}
        zoom={10}
        route={[[19.43, -99.13], [19.44, -99.14]]}
      />,
    );
    expect(document.querySelector('.h-64.w-full')).toBeInTheDocument();
  });

  it('renderiza con routeRequest sin errores', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        code: 'Ok',
        routes: [
          {
            geometry: {
              type: 'LineString',
              coordinates: [[-99.13, 19.43], [-99.14, 19.44]],
            },
          },
        ],
      }),
    });

    render(
      <MapView
        markers={[]}
        center={[19.43, -99.13]}
        zoom={10}
        routeRequest={{ from: [19.43, -99.13], to: [19.44, -99.14] }}
      />,
    );
    expect(document.querySelector('.h-64.w-full')).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('entrega la instancia de Leaflet a onMapReady al crear el mapa', () => {
    const onMapReady = vi.fn();

    render(
      <MapView
        markers={[]}
        center={[19.43, -99.13]}
        zoom={10}
        onMapReady={onMapReady}
      />,
    );

    expect(onMapReady).toHaveBeenCalledTimes(1);
    const mapInstance = onMapReady.mock.calls[0][0];
    expect(mapInstance).toBeDefined();
    expect(typeof mapInstance.setView).toBe('function');
  });

  it('en modo seguir, la vista sigue la ubicación del usuario en vez del centro fijo', () => {
    let mapInstance: { setView: ReturnType<typeof vi.fn> } | null = null;

    const view = render(
      <MapView
        markers={[]}
        center={[19.43, -99.13]}
        zoom={16}
        userLocation={[10.5, -66.9]}
        followUserLocation
        onMapReady={(map) => {
          mapInstance = map as unknown as { setView: ReturnType<typeof vi.fn> };
        }}
      />,
    );

    expect(mapInstance).not.toBeNull();
    mapInstance!.setView.mockClear();

    // Nueva posición GPS: en modo seguir la vista se recoloca sobre el usuario.
    view.rerender(
      <MapView
        markers={[]}
        center={[19.43, -99.13]}
        zoom={16}
        userLocation={[10.5002, -66.9003]}
        followUserLocation
        onMapReady={vi.fn()}
      />,
    );

    expect(mapInstance!.setView).toHaveBeenCalledWith([10.5002, -66.9003], 16);
  });
});

describe('fetchOsrmRoute', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.useRealTimers();
  });

  it('devuelve coordenadas de la ruta cuando OSRM responde Ok', async () => {
    const osrmCoords: Array<[number, number]> = [
      [-99.13, 19.43],
      [-99.135, 19.435],
      [-99.14, 19.44],
    ];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        code: 'Ok',
        routes: [{ geometry: { type: 'LineString', coordinates: osrmCoords } }],
      }),
    });

    const result = await fetchOsrmRoute([19.43, -99.13], [19.44, -99.14]);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('router.project-osrm.org/route/v1/driving/'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toEqual([
      [19.43, -99.13],
      [19.435, -99.135],
      [19.44, -99.14],
    ]);
  });

  it('devuelve fallback línea recta cuando fetch falla por red', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await fetchOsrmRoute([19.43, -99.13], [19.44, -99.14]);

    expect(result).toEqual([[19.43, -99.13], [19.44, -99.14]]);
  });

  it('devuelve fallback línea recta cuando OSRM responde con error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ code: 'NoRoute', routes: [] }),
    });

    const result = await fetchOsrmRoute([19.43, -99.13], [19.44, -99.14]);

    expect(result).toEqual([[19.43, -99.13], [19.44, -99.14]]);
  });

  it('devuelve fallback línea recta cuando HTTP no es ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await fetchOsrmRoute([19.43, -99.13], [19.44, -99.14]);

    expect(result).toEqual([[19.43, -99.13], [19.44, -99.14]]);
  });

  it('devuelve fallback línea recta cuando fetch aborta por timeout', async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url: string, opts: { signal?: AbortSignal } | undefined) => {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    const promise = fetchOsrmRoute([19.43, -99.13], [19.44, -99.14]);
    vi.advanceTimersByTime(6000);
    const result = await promise;

    expect(result).toEqual([[19.43, -99.13], [19.44, -99.14]]);
  });
});

describe('fetchOsrmRouteDetails', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.useRealTimers();
  });

  function osrmStepsPayload() {
    return {
      code: 'Ok',
      routes: [
        {
          geometry: {
            type: 'LineString',
            coordinates: [[-99.13, 19.43], [-99.135, 19.435], [-99.14, 19.44]] as Array<[number, number]>,
          },
          duration: 842.4,
          distance: 6632.5,
          legs: [
            {
              steps: [
                {
                  maneuver: { type: 'depart' },
                  name: 'Av. Principal',
                  distance: 290.1,
                },
                {
                  maneuver: { type: 'turn', modifier: 'right' },
                  name: 'Calle 8',
                  distance: 1200,
                },
                {
                  maneuver: { type: 'arrive' },
                  name: '',
                  distance: 0,
                },
              ],
            },
          ],
        },
      ],
    };
  }

  it('devuelve coordenadas, duración, distancia y pasos de navegación', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(osrmStepsPayload()),
    });

    const details = await fetchOsrmRouteDetails([19.43, -99.13], [19.44, -99.14]);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('steps=true'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(details.coordinates).toEqual([
      [19.43, -99.13],
      [19.435, -99.135],
      [19.44, -99.14],
    ]);
    expect(details.durationSeconds).toBeCloseTo(842.4);
    expect(details.distanceMeters).toBeCloseTo(6632.5);
    expect(details.steps).toHaveLength(3);
    expect(details.steps[1]?.maneuver).toEqual({ type: 'turn', modifier: 'right' });
    expect(details.steps[1]?.name).toBe('Calle 8');
  });

  it('degrada a línea recta sin pasos cuando OSRM falla', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const details = await fetchOsrmRouteDetails([19.43, -99.13], [19.44, -99.14]);

    expect(details.coordinates).toEqual([[19.43, -99.13], [19.44, -99.14]]);
    expect(details.durationSeconds).toBe(0);
    expect(details.distanceMeters).toBe(0);
    expect(details.steps).toEqual([]);
  });

  it('degrada a línea recta cuando OSRM responde sin rutas', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ code: 'NoRoute', routes: [] }),
    });

    const details = await fetchOsrmRouteDetails([19.43, -99.13], [19.44, -99.14]);

    expect(details.steps).toEqual([]);
    expect(details.coordinates).toHaveLength(2);
  });
});

describe('MerchantMapView', () => {
  const withLocation = (loc: { x: number; y: number }): MerchantRow => ({
    id: 'm-1',
    owner_id: 'o-1',
    name: 'Taquería Luna',
    slug: 'taqueria-luna',
    logo_url: null,
    banner_url: null,
    status: 'active',
    verification_docs: {},
    is_active: true,
    is_open: true,
    location: loc,
    created_at: '2026-01-01T00:00:00.000Z',
    rif: 'J-12345678-0',
    category: 'Restaurante',
    description: 'Descripción',
     address: 'Dirección',
     zone: null,
     phone_whatsapp: '+58 412-123-4567',
     service_modalities: ['Comer en el local'],
     business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
  });

  it('muestra los comercios en el mapa', () => {
    const merchants: MerchantRow[] = [
      withLocation({ x: -99.13, y: 19.43 }),
      withLocation({ x: -99.14, y: 19.44 }),
    ];

    render(<MerchantMapView merchants={merchants} />);
    const mapContainer = document.querySelector('.h-80.w-full');
    expect(mapContainer).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando ningún comercio tiene ubicación', () => {
    const merchants: MerchantRow[] = [
      { ...withLocation(null as never) },
    ];
    render(<MerchantMapView merchants={merchants} />);
    expect(
      screen.getByText(/No hay comercios con ubicación disponible/i),
    ).toBeInTheDocument();
  });
});

describe('MerchantsByDistance', () => {
  const base: MerchantRow = {
    id: 'm-1',
    owner_id: 'o-1',
    name: 'Test',
    slug: 'test',
    logo_url: null,
    banner_url: null,
    status: 'active',
    verification_docs: {},
    is_active: true,
    is_open: true,
    location: null,
    created_at: '2026-01-01T00:00:00.000Z',
    rif: 'J-12345678-0',
    category: 'Restaurante',
    description: 'Descripción',
    address: 'Dirección',
    zone: null,
    phone_whatsapp: '+58 412-123-4567',
    service_modalities: ['Comer en el local'],
    business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
  };

  it('ordena comercios por proximidad al punto origen', () => {
    const origin = { x: 0, y: 0 };
    const merchants: MerchantRow[] = [
      { ...base, id: 'far', location: { x: 10, y: 10 } },
      { ...base, id: 'near', location: { x: 0.01, y: 0.01 } },
    ];

    const sorted = merchantsByDistance(merchants, origin);
    expect(sorted[0].id).toBe('near');
    expect(sorted[1].id).toBe('far');
  });

  it('coloca comercios sin ubicación al final', () => {
    const origin = { x: 0, y: 0 };
    const merchants: MerchantRow[] = [
      { ...base, id: 'nostore', location: null },
      { ...base, id: 'near', location: { x: 0.01, y: 0.01 } },
    ];

    const sorted = merchantsByDistance(merchants, origin);
    expect(sorted[sorted.length - 1].id).toBe('nostore');
  });
});
