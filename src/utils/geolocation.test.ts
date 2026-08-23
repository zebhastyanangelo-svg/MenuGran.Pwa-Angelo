import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import {
  GEOLOCATION_UNSUPPORTED_MESSAGE,
  getCurrentGeoPoint,
  isGeolocationSupported,
  resolveGeolocationErrorMessage,
} from './geolocation';

const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

const originalGeolocation = navigator.geolocation;

describe('isGeolocationSupported', () => {
  it('devuelve true cuando el navegador expone la API', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });
    expect(isGeolocationSupported()).toBe(true);
  });

  it('devuelve false cuando la API no existe', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });
    expect(isGeolocationSupported()).toBe(false);
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
  });
});

describe('getCurrentGeoPoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });
  });

  it('resuelve con GeoPoint x=longitud, y=latitud', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 10.4806, longitude: -66.9036 } });
    });

    await expect(getCurrentGeoPoint()).resolves.toEqual({
      x: -66.9036,
      y: 10.4806,
    });
  });

  it('rechaza cuando el usuario deniega el permiso (code 1)', async () => {
    const permissionError = Object.assign(new Error('denied'), { code: 1 });
    mockGeolocation.getCurrentPosition.mockImplementation(
      (_success, failure) => {
        failure(permissionError);
      },
    );

    await expect(getCurrentGeoPoint()).rejects.toBe(permissionError);
  });

  it('rechaza cuando el dispositivo devuelve coordenadas inválidas', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: Number.NaN, longitude: 1 } });
    });

    await expect(getCurrentGeoPoint()).rejects.toThrow(
      'coordenadas inválidas',
    );
  });

  it('rechaza cuando el navegador no soporta geolocalización', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    await expect(getCurrentGeoPoint()).rejects.toThrow(
      GEOLOCATION_UNSUPPORTED_MESSAGE,
    );
  });
});

describe('resolveGeolocationErrorMessage', () => {
  it('mapea el código de permiso denegado a un mensaje amigable', () => {
    expect(
      resolveGeolocationErrorMessage(
        Object.assign(new Error(), { code: 1 }),
      ),
    ).toContain('Permiso de ubicación denegado');
  });

  it('mapea posición no disponible y timeout', () => {
    expect(
      resolveGeolocationErrorMessage(Object.assign(new Error(), { code: 2 })),
    ).toContain('GPS esté activo');
    expect(
      resolveGeolocationErrorMessage(Object.assign(new Error(), { code: 3 })),
    ).toContain('agotó');
  });

  it('devuelve el mensaje de soporte cuando falta la API', () => {
    expect(
      resolveGeolocationErrorMessage(new Error(GEOLOCATION_UNSUPPORTED_MESSAGE)),
    ).toBe(GEOLOCATION_UNSUPPORTED_MESSAGE);
  });

  it('devuelve un mensaje genérico para errores desconocidos', () => {
    expect(resolveGeolocationErrorMessage(undefined)).toContain(
      'No se pudo obtener tu ubicación',
    );
  });
});
