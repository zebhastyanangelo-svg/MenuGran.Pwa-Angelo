/**
 * Generación de códigos QR para los comercios.
 *
 * El QR codifica la URL pública de la tienda del comercio, de modo que el
 * cliente lo escanea con la cámara nativa del teléfono y aterriza en su
 * página sin necesitar la app instalada. Se genera **localmente** con `qrcode`
 * (SVG/PNG en el navegador): el contenido nunca sale del dispositivo.
 */

import QRCode from 'qrcode';
import type { QRCodeToDataURLOptions } from 'qrcode';

/**
 * El QR codifica `/q/{qr_token}`, no el UUID del comercio.
 *
 * Así el código impreso no expone identificadores internos y el token puede
 * rotarse desde el panel para revocar los impresos antiguos.
 */
export const MERCHANT_QR_PATH = '/q';

/** Ruta pública, absoluta, que se codifica en el QR. */
export function buildMerchantQrUrl(qrToken: string, origin?: string): string {
  const base = origin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  return `${base}${MERCHANT_QR_PATH}/${qrToken}`;
}

/** Detecta el origen actual sin fallar en SSR/test. */
function currentOrigin(): string {
  return typeof window === 'undefined' ? '' : window.location.origin;
}

/** PNG como data URL, listo para `<img src>` o descarga. */
export async function generateQrDataUrl(payload: string, size = 512): Promise<string> {
  const options: QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: size,
    color: { dark: '#0f172a', light: '#ffffff' },
  };

  return QRCode.toDataURL(payload, options);
}

/** SVG como texto, nítido a cualquier tamaño de impresión. */
export async function generateQrSvg(payload: string, size = 512): Promise<string> {
  const options: QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: size,
    color: { dark: '#0f172a', light: '#ffffff' },
  };

  return QRCode.toString(payload, { ...options, type: 'svg' });
}

/** Data URL del QR de la tienda de un comercio. */
export function generateMerchantQrDataUrl(qrToken: string, size = 512): Promise<string> {
  return generateQrDataUrl(buildMerchantQrUrl(qrToken, currentOrigin()), size);
}

/**
 * Genera un token nuevo para el QR. Se usa al rotarlo desde el panel: los
 * códigos ya impresos dejan de resolver y hay que reimprimir.
 */
export function generateQrToken(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid !== undefined) return uuid;

  // Respaldo para entornos sin randomUUID; el token sólo necesita ser
  // imprevisible e inequívoco, no criptográficamente fuerte.
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Lanza la descarga del PNG del QR.
 * No hace nada en entornos sin `document` (SSR, tests).
 */
export function downloadQrPng(dataUrl: string, fileName: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Nombre de archivo seguro a partir del nombre del comercio. */
export function buildQrFileName(merchantName: string, extension = 'png'): string {
  const slug = merchantName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `qr-${slug !== '' ? slug : 'comercio'}.${extension}`;
}