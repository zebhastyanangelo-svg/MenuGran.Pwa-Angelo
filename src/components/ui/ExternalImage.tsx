import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { normalizeImageUrl } from '../../utils/imageUrl';

export interface ExternalImageProps {
  /** URL cruda guardada en la base de datos ( puede venir en http o sin protocolo). */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Respaldo visual que se muestra si la URL es inválida o falla al cargar. */
  fallback: ReactNode;
}

/**
 * `<img>` endurecida para imágenes externas de ImgBB (logos, banners y platos).
 *
 * - Normaliza la URL a HTTPS absoluto antes de asignarla al `src`, evitando
 *   bloqueos de contenido mixto en navegadores móviles (WebView / PWA).
 * - Envía `referrerPolicy="no-referrer"`: algunos navegadores móviles y CDNs
 *   rechazan peticiones de imágenes con Referer cruzado.
 * - Si la imagen falla al cargar en un dispositivo (red, caché del Service
 *   Worker o decodificación), registra con `console.error` la URL exacta
 *   que falló (conservada en el build de producción para poder depurar en
 *   un teléfono real) y muestra el `fallback` recibido en lugar de dejar
 *   el hueco con el ícono de imagen rota.
 */
export function ExternalImage({ src, alt, className, fallback }: ExternalImageProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = normalizeImageUrl(src);

  useEffect(() => {
    setHasError(false);
  }, [normalizedSrc]);

  if (normalizedSrc === null || hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(event) => {
        // `currentTarget.src` es la URL absoluta que el navegador realmente
        // solicitó: es lo que hay que ver en consola al depurar en móvil.
        console.error('[ExternalImage] Error al cargar imagen externa', {
          url: event.currentTarget.src || normalizedSrc,
          alt,
        });
        setHasError(true);
      }}
      className={className}
    />
  );
}
