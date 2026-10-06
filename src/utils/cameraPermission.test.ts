import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  CAMERA_ERROR_MESSAGES,
  CAMERA_GENERIC_MESSAGE,
  CAMERA_UNSUPPORTED_MESSAGE,
  CAMERA_VIDEO_CONSTRAINTS,
  isCameraSupported,
  queryCameraPermission,
  requestCameraStream,
  resolveCameraErrorMessage,
} from './cameraPermission';

function domException(name: string): DOMException {
  return new DOMException(name, name);
}

function setMediaDevices(value: unknown): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    value,
    configurable: true,
    writable: true,
  });
}

const originalMediaDevices = navigator.mediaDevices;

/**
 * jsdom no implementa `navigator.permissions`, así que se define a mano como
 * cualquier otra propiedad de `navigator`.
 */
function setPermissions(value: unknown): void {
  Object.defineProperty(navigator, 'permissions', {
    value,
    configurable: true,
    writable: true,
  });
}

function mockPermissionsQuery(
  query: (descriptor: { name: string }) => Promise<unknown>,
): void {
  setPermissions({ query });
}

describe('cameraPermission', () => {
  beforeEach(() => {
    setMediaDevices({ getUserMedia: vi.fn() });
    setPermissions({ query: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  describe('isCameraSupported', () => {
    it('devuelve true cuando getUserMedia es una función', () => {
      expect(isCameraSupported()).toBe(true);
    });

    it('devuelve false cuando no hay mediaDevices (contexto no seguro)', () => {
      setMediaDevices(undefined);
      expect(isCameraSupported()).toBe(false);
    });

    it('devuelve false cuando mediaDevices existe sin getUserMedia', () => {
      setMediaDevices({});
      expect(isCameraSupported()).toBe(false);
    });
  });

  describe('requestCameraStream', () => {
    it('pide la cámara trasera y sin audio', async () => {
      const stream = { getTracks: vi.fn() } as unknown as MediaStream;
      const getUserMedia = vi.fn().mockResolvedValue(stream);
      setMediaDevices({ getUserMedia });

      await expect(requestCameraStream()).resolves.toBe(stream);
      expect(getUserMedia).toHaveBeenCalledWith(CAMERA_VIDEO_CONSTRAINTS);
      expect(CAMERA_VIDEO_CONSTRAINTS.video).toEqual({
        facingMode: 'environment',
      });
      expect(CAMERA_VIDEO_CONSTRAINTS.audio).toBe(false);
    });

    it('rechaza con el mensaje de no soportado si falta la API', async () => {
      setMediaDevices(undefined);

      await expect(requestCameraStream()).rejects.toThrow(
        CAMERA_UNSUPPORTED_MESSAGE,
      );
    });

    it('propaga el DOMException original cuando el permiso es denegado', async () => {
      setMediaDevices({
        getUserMedia: vi.fn().mockRejectedValue(domException('NotAllowedError')),
      });

      await expect(requestCameraStream()).rejects.toMatchObject({
        name: 'NotAllowedError',
      });
    });
  });

  describe('queryCameraPermission', () => {
    it('devuelve el estado real del permiso', async () => {
      mockPermissionsQuery(vi.fn().mockResolvedValue({ state: 'granted' }));

      await expect(queryCameraPermission()).resolves.toBe('granted');
    });

    it('normaliza un estado desconocido a prompt', async () => {
      mockPermissionsQuery(vi.fn().mockResolvedValue({ state: 'algo-raro' }));

      await expect(queryCameraPermission()).resolves.toBe('prompt');
    });

    it('degrada a prompt si el navegador no soporta la consulta', async () => {
      mockPermissionsQuery(vi.fn().mockRejectedValue(new TypeError('no')));

      await expect(queryCameraPermission()).resolves.toBe('prompt');
    });

    it('degrada a prompt si no existe permissions.query', async () => {
      setPermissions({});

      await expect(queryCameraPermission()).resolves.toBe('prompt');
    });

    it('devuelve unsupported sin la API de cámara', async () => {
      setMediaDevices(undefined);

      await expect(queryCameraPermission()).resolves.toBe('unsupported');
    });
  });

  describe('resolveCameraErrorMessage', () => {
    it.each([
      'NotAllowedError',
      'SecurityError',
      'NotFoundError',
      'NotReadableError',
      'OverconstrainedError',
      'AbortError',
    ])('traduce %s a un mensaje en español', (name) => {
      expect(resolveCameraErrorMessage(domException(name))).toBe(
        CAMERA_ERROR_MESSAGES[name],
      );
      expect(CAMERA_ERROR_MESSAGES[name].length).toBeGreaterThan(0);
    });

    it('conserva el mensaje de no soportado', () => {
      expect(
        resolveCameraErrorMessage(new Error(CAMERA_UNSUPPORTED_MESSAGE)),
      ).toBe(CAMERA_UNSUPPORTED_MESSAGE);
    });

    it('cae en el mensaje genérico ante errores desconocidos', () => {
      expect(resolveCameraErrorMessage(new Error('boom'))).toBe(
        CAMERA_GENERIC_MESSAGE,
      );
      expect(resolveCameraErrorMessage(null)).toBe(CAMERA_GENERIC_MESSAGE);
    });
  });
});