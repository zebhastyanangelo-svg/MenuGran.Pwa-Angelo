const IMGBB_HOSTS = new Set(['ibb.co', 'www.ibb.co', 'i.ibb.co']);

/**
 * Normaliza una URL de imagen externa (ImgBB) a HTTPS absoluto:
 *
 * - Recorta espacios en blanco.
 * - Resuelve URLs relativas al protocolo (`//i.ibb.co/...`).
 * - Fuerza HTTPS en los dominios de ImgBB: los navegadores móviles (WebView
 *   y PWA) bloquean el contenido mixto `http://` y algunos decodificadores
 *   nativos fallan con esquemas no absolutos.
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
    if (parsed.protocol === 'http:' && IMGBB_HOSTS.has(parsed.hostname)) {
      parsed.protocol = 'https:';
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
