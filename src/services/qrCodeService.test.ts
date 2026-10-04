import { describe, expect, it } from 'vitest';
import {
  buildMerchantQrUrl,
  buildQrFileName,
  MERCHANT_QR_PATH,
  generateQrDataUrl,
  generateQrToken,
} from './qrCodeService';

describe('buildMerchantQrUrl', () => {
  it('construye la ruta pública con el origen indicado', () => {
    expect(buildMerchantQrUrl('token-abc', 'https://menugran.com')).toBe(
      `https://menugran.com${MERCHANT_QR_PATH}/token-abc`,
    );
  });

  it('usa el origen de la ventana cuando no se indica', () => {
    expect(buildMerchantQrUrl('token-abc')).toBe(
      `${window.location.origin}${MERCHANT_QR_PATH}/token-abc`,
    );
  });

  it('no expone el id interno del comercio en la ruta', () => {
    // El UUID del comercio no debe aparecer en el QR: por eso la ruta usa
    // /q/{token} y no /merchant/{id}.
    expect(buildMerchantQrUrl('token-abc', 'https://menugran.com')).not.toContain('/merchant/');
  });
});

describe('buildQrFileName', () => {
  it('convierte el nombre en un slug seguro', () => {
    expect(buildQrFileName('Sabor Criollo')).toBe('qr-sabor-criollo.png');
  });

  it('elimina acentos y signos', () => {
    expect(buildQrFileName('Panadería Ñandú')).toBe('qr-panaderia-nandu.png');
  });

  it('normaliza espacios múltiples y guiones', () => {
    expect(buildQrFileName('  Donde   Pepe  ')).toBe('qr-donde-pepe.png');
  });

  it('usa un nombre genérico si el nombre queda vacío', () => {
    expect(buildQrFileName('***')).toBe('qr-comercio.png');
    expect(buildQrFileName('')).toBe('qr-comercio.png');
  });

  it('permite cambiar la extensión', () => {
    expect(buildQrFileName('Sabor Criollo', 'svg')).toBe('qr-sabor-criollo.svg');
  });
});

describe('generateQrToken', () => {
  it('genera tokens distintos en cada llamada', () => {
    const tokens = new Set([generateQrToken(), generateQrToken(), generateQrToken()]);
    expect(tokens.size).toBe(3);
  });

  it('produce un token sin caracteres que rompan la URL', () => {
    expect(generateQrToken()).toMatch(/^[A-Za-z0-9-]+$/);
  });
});

describe('generateQrDataUrl', () => {
  it('genera un PNG en base64 válido', async () => {
    const dataUrl = await generateQrDataUrl('https://menugran.com/q/abc');

    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('acepta distintos tamaños', async () => {
    const small = await generateQrDataUrl('https://menugran.com/q/abc', 128);
    const large = await generateQrDataUrl('https://menugran.com/q/abc', 512);

    expect(small).not.toBe(large);
  });

  it('codifica contenidos distintos en imágenes distintas', async () => {
    const first = await generateQrDataUrl('https://menugran.com/q/abc');
    const second = await generateQrDataUrl('https://menugran.com/q/xyz');

    expect(first).not.toBe(second);
  });
});