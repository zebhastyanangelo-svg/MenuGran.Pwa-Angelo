import { describe, expect, it } from 'vitest';
import { extractQrToken, isBarcodeDetectorSupported } from './qrToken';

describe('extractQrToken', () => {
  it('extrae el token de una URL completa del QR', () => {
    expect(extractQrToken('https://menugran.app/q/abc-123')).toBe('abc-123');
    expect(extractQrToken('http://localhost:5173/q/abc-123')).toBe('abc-123');
  });

  it('acepta query y hash además del path', () => {
    expect(extractQrToken('https://menugran.app/?q=abc-123')).toBe('abc-123');
    expect(extractQrToken('https://menugran.app/#q/abc-123')).toBe('abc-123');
  });

  it('ignora lo que venga después del token', () => {
    expect(extractQrToken('https://menugran.app/q/abc-123?mesa=4')).toBe(
      'abc-123',
    );
  });

  it('acepta un token suelto', () => {
    expect(extractQrToken('abc-123')).toBe('abc-123');
    expect(extractQrToken('  abc-123  ')).toBe('abc-123');
  });

  it('devuelve null cuando no hay nada reconocible', () => {
    expect(extractQrToken('')).toBeNull();
    expect(extractQrToken('   ')).toBeNull();
    expect(extractQrToken('https://menugran.app/otra-ruta')).toBeNull();
    expect(extractQrToken('texto con espacios')).toBeNull();
  });
});

describe('isBarcodeDetectorSupported', () => {
  // `BarcodeDetector` no está en los tipos de `lib.dom`, por eso el acceso
  // pasa por un cast explícito en lugar de `window.BarcodeDetector`.
  const detectorHost = window as unknown as { BarcodeDetector?: unknown };

  it('detecta la ausencia de BarcodeDetector (jsdom)', () => {
    expect(detectorHost.BarcodeDetector).toBeUndefined();
    expect(isBarcodeDetectorSupported()).toBe(false);
  });

  it('detecta la presencia de BarcodeDetector', () => {
    const original = detectorHost.BarcodeDetector;
    detectorHost.BarcodeDetector = function Fake() {};

    try {
      expect(isBarcodeDetectorSupported()).toBe(true);
    } finally {
      detectorHost.BarcodeDetector = original;
    }
  });
});