/**
 * Lectura del token de comercio codificado en el QR impreso.
 *
 * Módulo separado de la página del lector para no romper el fast-refresh de
 * React (mismo criterio que `onboardingStorage.ts`).
 */

/**
 * Detector de códigos QR de la plataforma.
 *
 * Se declara la forma mínima de `BarcodeDetector` en vez de usar los tipos de
 * `lib.dom` porque TypeScript no expone esa API y el proyecto usa
 * `verbatimModuleSyntax` con `noUnusedLocals`.
 */
export interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

export interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

export function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
  if (typeof candidate !== 'function') return null;
  return candidate as BarcodeDetectorConstructor;
}

/**
 * `true` si el navegador puede decodificar QR sin dependencias externas.
 *
 * Chromium/Android la implementa; Safari y Firefox no, y en jsdom tampoco
 * está, por eso se comprueba antes de construir nada.
 */
export function isBarcodeDetectorSupported(): boolean {
  return getBarcodeDetector() !== null;
}

/**
 * Extrae el token del comercio de lo que devuelve el lector.
 *
 * Acepta el texto completo del QR (`https://…/q/<token>`), la URL por sí sola
 * y el token suelto, porque un QR puede imprimirse como enlace, como URL o
 * como código y el lector no debe fallar por el formato. Devuelve `null` si
 * el texto no contiene nada reconocible como token.
 */
export function extractQrToken(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;

  // Acepta las tres formas en las que un enlace puede llevar el token:
  // `/q/<token>` en el path, `?q=<token>` en la query y `#q/<token>` en el
  // hash. El carácter previo debe ser un separador de URL para no capturar
  // un "q" que sea parte de otra palabra.
  const fromUrl = value.match(/[/#?]q[=/]([^/?#&\s]+)/);
  if (fromUrl?.[1]) return fromUrl[1];

  const looksLikeBareToken =
    !value.includes('/') && !value.includes('\\') && !/\s/.test(value);
  return looksLikeBareToken ? value : null;
}