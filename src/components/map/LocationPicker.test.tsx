import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LocationPicker } from './LocationPicker';

vi.mock('leaflet', () => {
  const mockMap = {
    setView: vi.fn(),
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

describe('LocationPicker', () => {
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
});
