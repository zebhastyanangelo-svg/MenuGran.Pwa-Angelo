const IMGBB_HOSTS = new Set(['ibb.co', 'www.ibb.co', 'i.ibb.co']);

/** Hosts que sirven la página del visor HTML de ImgBB (no son imágenes). */
const IMGBB_VIEWER_HOSTS = new Set(['ibb.co', 'www.ibb.co']);

/**
 * Normaliza una URL de imagen externa (ImgBB) a HTTPS absoluto:
 *
 * - Recorta espacios en blanco.
 * - Resuelve URLs relativas al protocolo (`//i.ibb.co/...`).
 * - Fuerza HTTPS en los dominios de ImgBB: los navegadores móviles (WebView
 *   y PWA) bloquean el contenido mixto `http://` y algunos decodificadores
 *   nativos fallan con esquemas no absolutos.
 * - Solo acepta URLs web (`http://` / `https://`): esquemas como `blob:`
 *   (objetos efímeros por sesión que mueren al recargar o en otro
 *   dispositivo) o `data:` fallan en móvil/PWA, así que se descartan para
 *   que la vista muestre su fallback limpio de inmediato.
 *
 * Devuelve `null` si la URL está vacía o no se puede parsear, para que el
 * componente que la renderiza muestre su respaldo visual en su lugar.
 */
export function normalizeImageUrl(
  rawUrl: string | null | undefined,
): string | null {
  if (rawUrl === null || rawUrl === undefined) return null;

  const trimmed = rawUrl.trim();
  if (trimmed === '') return null;

  const withProtocol = trimmed.startsWith('//')
    ? `https:${trimmed}`
    : trimmed;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.protocol === 'http:' && IMGBB_HOSTS.has(parsed.hostname)) {
      parsed.protocol = 'https:';
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Detecta si una URL apunta a la página del visor HTML de ImgBB
 * (`https://ibb.co/<id>`), que es un documento HTML y NO una imagen
 * renderizable dentro de un `<img>`. Solo el CDN `i.ibb.co` sirve archivos
 * de imagen directos y persistentes; una URL de visor guardada en la base
 * de datos deja la foto rota en el dispositivo (los móviles no hacen
 * content-sniffing de páginas dentro de `<img>`).
 */
export function isImgbbViewerUrl(url: string): boolean {
  try {
    return IMGBB_VIEWER_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Parámetro de query string con el que se versiona la URL de una imagen. */
export const IMAGE_CACHE_VERSION_PARAM = 'v';

/**
 * Normaliza el valor de versión de un recurso a un token corto y estable.
 *
 * Las versiones llegan como marcas de tiempo ISO (`image_version` de la base
 * de datos) o como números. Las marcas ISO se convierten a epoch en
 * milisegundos para que el parámetro quede compacto y legible; cualquier
 * otro valor se usa tal cual, recortado.
 *
 * Devuelve `null` cuando no hay una versión utilizable, de modo que la URL
 * se sirve sin parametro (comportamiento original).
 */
export function resolveImageVersionToken(
  version: string | number | null | undefined,
): string | null {
  if (version === null || version === undefined) return null;

  if (typeof version === 'number') {
    return Number.isFinite(version) ? String(Math.trunc(version)) : null;
  }

  const trimmed = version.trim();
  if (trimmed === '') return null;

  const asTimestamp = Date.parse(trimmed);
  return Number.isNaN(asTimestamp) ? trimmed : String(asTimestamp);
}

/**
 * Añade (o reemplaza) el parámetro de versión en la URL de una imagen para
 * invalidar la copia cacheada por el navegador y por el Service Worker.
 *
 * Cuando el comercio cambia su logo, su banner o la foto de un plato, la URL
 * base puede seguir siendo servida desde la cache HTTP del movil durante
 * dias. Anexar `?v=<version>` cambia la clave de cache: el navegador pide
 * el recurso de nuevo y muestra la version vigente.
 *
 * - Solo se versionan URLs `http`/`https`: los esquemas opacos (`data:`,
 *   `blob:`) no admiten query string sin corromper el contenido.
 * - Si la URL ya trae un parametro `v`, se reemplaza por el nuevo.
 * - Si no hay version utilizable, la URL se devuelve intacta.
 */
export function withImageCacheVersion(
  url: string,
  version: string | number | null | undefined,
): string {
  const token = resolveImageVersionToken(version);
  if (token === null) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return url;
    }
    parsed.searchParams.set(IMAGE_CACHE_VERSION_PARAM, token);
    return parsed.toString();
  } catch {
    return url;
  }
}
