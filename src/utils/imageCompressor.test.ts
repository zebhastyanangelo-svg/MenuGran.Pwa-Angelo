import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  PAYMENT_PROOF_MAX_BYTES,
  buildProofFileName,
  compressImage,
  looksLikeImageFile,
} from './imageCompressor';

/**
 * Mock de la Canvas API para jsdom.
 *
 * jsdom no implementa `HTMLCanvasElement.toBlob` ni `getContext('2d')`,
 * por lo que interceptamos `document.createElement('canvas')` y devolvemos
 * un objeto cuya `toBlob` llama al callback con un blob cuyo tamaño está
 * controlado por `blobSizeForTest`.
 */

let blobSizeForTest = 100_000;

function makeBlob(size: number, type: string = 'image/jpeg'): Blob {
  const buffer = new ArrayBuffer(size);
  return new Blob([buffer], { type });
}

beforeEach(() => {
  blobSizeForTest = 100_000;

  const fakeCtx = {
    fillStyle: '#ffffff',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };

  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => fakeCtx),
    toBlob: vi.fn((cb: ((b: Blob | null) => void)) => {
      cb(makeBlob(blobSizeForTest));
    }),
  };

  const originalCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return fakeCanvas as unknown as HTMLCanvasElement;
    }
    return originalCreate(tagName);
  });

  // Polyfill URL.createObjectURL and URL.revokeObjectURL for jsdom
  const createObjectURL = vi.fn().mockImplementation(() => 'fake-url');
  const revokeObjectURL = vi.fn();
  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    writable: true,
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    writable: true,
    configurable: true,
    value: revokeObjectURL,
  });

  // Mock Image to simulate immediate load when src is set to 'fake-url'
  const imageMock = vi.fn().mockImplementation(() => {
    const img = Object.create(HTMLImageElement.prototype);
    let naturalWidthValue = 1024;
    let naturalHeightValue = 768;
    let srcValue = '';
    let _onload: (() => void) | null = null;
    let _onerror: (() => void) | null = null;

    Object.defineProperty(img, 'naturalWidth', {
      get: () => naturalWidthValue,
    });
    Object.defineProperty(img, 'naturalHeight', {
      get: () => naturalHeightValue,
    });
    Object.defineProperty(img, 'src', {
      set: (url: string) => {
        srcValue = url;
        if (url === 'fake-url' && _onload) {
          // Call the onload callback synchronously
          _onload();
        }
      },
      get: () => srcValue,
    });
    Object.defineProperty(img, 'onload', {
      set: (fn: (() => void) | null) => {
        _onload = fn;
      },
      get: () => _onload,
    });
    Object.defineProperty(img, 'onerror', {
      set: (fn: (() => void) | null) => {
        _onerror = fn;
      },
      get: () => _onerror,
    });
    return img;
  });
  vi.spyOn(globalThis, 'Image').mockImplementation(imageMock);
});

describe('PAYMENT_PROOF_MAX_BYTES', () => {
  it('equivale a 153600 bytes (150 KB)', () => {
    expect(PAYMENT_PROOF_MAX_BYTES).toBe(150 * 1024);
    expect(PAYMENT_PROOF_MAX_BYTES).toBe(153_600);
  });
});

describe('buildProofFileName', () => {
  it('produce ruta con orderId y extensión .jpg', () => {
    const name = buildProofFileName('order-123');
    expect(name.startsWith('order-123/')).toBe(true);
    expect(name.endsWith('.jpg')).toBe(true);
  });

  it('es distinto entre llamadas consecutivas (aleatoriedad)', () => {
    const a = buildProofFileName('o1');
    const b = buildProofFileName('o1');
    expect(a).not.toBe(b);
  });
});

describe('looksLikeImageFile', () => {
  it('detecta imágenes por su MIME type', () => {
    expect(looksLikeImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(looksLikeImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(true);
  });

  it('detecta imágenes por extensión cuando el MIME viene vacío (Google Drive)', () => {
    expect(looksLikeImageFile(new File(['x'], 'foto.jpg', { type: '' }))).toBe(true);
    expect(looksLikeImageFile(new File(['x'], 'foto.PNG', { type: '' }))).toBe(true);
    expect(looksLikeImageFile(new File(['x'], 'foto.webp', { type: '' }))).toBe(true);
  });

  it('detecta imágenes por extensión cuando el MIME es octet-stream', () => {
    const file = new File(['x'], 'comprobante.jpeg', { type: 'application/octet-stream' });
    expect(looksLikeImageFile(file)).toBe(true);
  });

  it('no trata como imagen un PDF ni otro tipo declarado', () => {
    expect(looksLikeImageFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
    expect(looksLikeImageFile(new File(['x'], 'a.mp4', { type: 'video/mp4' }))).toBe(false);
  });

  it('no trata como imagen un archivo sin extensión de imagen', () => {
    expect(looksLikeImageFile(new File(['x'], 'documento.pdf', { type: '' }))).toBe(false);
    expect(looksLikeImageFile(new File(['x'], 'comprobante.txt', { type: '' }))).toBe(false);
  });
});

describe('compressImage', () => {
  it('devuelve un blob bajo el límite cuando la compresión cabe', async () => {
    blobSizeForTest = 80_000;

    const result = await compressImage(
      makeBlob(500_000),
      PAYMENT_PROOF_MAX_BYTES,
    );

    expect(result.size).toBeLessThanOrEqual(PAYMENT_PROOF_MAX_BYTES);
    expect(result.type).toBe('image/jpeg');
    expect(result.blob.type).toBe('image/jpeg');
  });

  it('rechaza archivo vacío', async () => {
    await expect(compressImage(makeBlob(0))).rejects.toThrow(
      'El archivo de imagen está vacío.',
    );
  });
});
