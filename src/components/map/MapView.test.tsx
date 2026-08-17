import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MerchantRow } from '../../types/database';
import {
  MapView,
  MerchantMapView,
} from './MapView';
import { merchantsByDistance } from '../../utils/distance';

vi.mock('leaflet', () => {
  const layers: Record<string, unknown[]> = {};
  const instanceMap: Record<string, unknown[]> = {};

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
  };

  const markerFn = vi.fn((_latlng: unknown, _options?: unknown) => {
    const markerInstance = {
      addTo: vi.fn(),
      bindPopup: vi.fn(),
      on: vi.fn(),
      remove: vi.fn(),
      setLatLng: vi.fn(),
    };
    return markerInstance;
  });

  const circleMarkerFn = vi.fn((_latlng: unknown, _options?: unknown) => ({
    addTo: vi.fn(),
  }));

  const iconFn = vi.fn((_options: unknown) => ({ _options }));

  return {
    default: {
      map: vi.fn(() => mockMap),
      marker: markerFn,
      circleMarker: circleMarkerFn,
      icon: iconFn,
      Marker: class {},
      CircleMarker: class {},
    },
    __layers: layers,
    __instanceMap: instanceMap,
    __mockMap: mockMap,
  };
});

vi.mock('leaflet/dist/leaflet.css', () => ({}));

describe('MapView', () => {
  it('renderiza el contenedor del mapa', () => {
    render(<MapView markers={[]} />);
    const mapContainer = document.querySelector('.h-64.w-full');
    expect(mapContainer).toBeInTheDocument();
  });

  it('renderiza sin marcadores sin errores', () => {
    render(<MapView markers={[]} center={[19.43, -99.13]} zoom={10} />);
    expect(document.querySelector('.h-64.w-full')).toBeInTheDocument();
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
    location: loc,
    created_at: '2026-01-01T00:00:00.000Z',
    rif: 'J-12345678-0',
    category: 'General',
    description: 'Descripción',
     address: 'Dirección',
    phone_whatsapp: '+58 412-123-4567',
    service_modalities: ['dine_in'],
    business_hours: 'L-V: 8:00-20:00',
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
    location: null,
    created_at: '2026-01-01T00:00:00.000Z',
    rif: 'J-12345678-0',
    category: 'General',
    description: 'Descripción',
    address: 'Dirección',
    phone_whatsapp: '+58 412-123-4567',
    service_modalities: ['dine_in'],
    business_hours: 'L-V: 8:00-20:00',
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
