/**
 * Permisos de cámara del navegador para el lector de códigos QR.
 *
 * `getUserMedia` es la única vía para obtener la cámara desde la web: es la que
 * dispara el diálogo nativo de permiso del navegador. Este módulo la aísla para
 * poder comprobar soporte, consultar el estado previo del permiso y traducir los
 * `DOMException` a mensajes en español sin mezclarse con la lógica del lector.
 *
 * Ninguna función lanza: la disponibilidad se consulta con `isCameraSupported()`
 * y los fallos viajan como `DOMException` originales para que quien llama los
 * traduzca con `resolveCameraErrorMessage`.
 */

/** Restricción de vídeo: cámara trasera, la que enfoca el QR de la mesa. */
export const CAMERA_VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: 'environment' },
  audio: false,
};

export const CAMERA_UNSUPPORTED_MESSAGE =
  'Este navegador no permite usar la cámara desde la web. Abre la PWA en https o escribe el código del QR a mano.';

export const CAMERA_ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError:
    'Permiso de cámara denegado. Actívalo en el candado de la barra de direcciones y vuelve a intentar.',
  SecurityError:
    'La cámara solo se puede usar en una conexión segura (https). Escribe el código del QR a mano.',
  NotFoundError:
    'No encontramos ninguna cámara en este dispositivo. Usa la cámara de tu teléfono para abrir el QR impreso.',
  NotReadableError:
    'Otra aplicación está usando la cámara. Ciérrala e inténtalo de nuevo.',
  OverconstrainedError:
    'Este dispositivo no tiene una cámara trasera disponible.',
  AbortError: 'La cámara se cerró antes de terminar de activarse.',
};

export const CAMERA_GENERIC_MESSAGE =
  'No pudimos abrir la cámara. Puedes escribir el código del QR a mano.';

/**
 * Estado del permiso de cámara declarado por el navegador.
 * `unsupported` significa que la cámara no existe (contexto no seguro o API
 * ausente); la ausencia de `permissions.query` NO es `unsupported`, porque el
 * permiso se sigue resolviendo en el primer `getUserMedia`.
 */
export type CameraPermissionState =
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unsupported';

/**
 * `true` si el navegador expone `getUserMedia`.
 *
 * Vuelve `false` fuera de un contexto seguro (http sin localhost) porque ahí
 * `navigator.mediaDevices` no existe: es el motivo más habitual de que la
 * cámara "no abra" en un PWA instalado por IP.
 */
export function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

/**
 * Consulta el estado del permiso sin mostrar ningún diálogo.
 *
 * Firefox y Safari no implementan `query({ name: 'camera' })`; ahí se degrada a
 * `prompt`, que es el estado real: el permiso se decide en el primer
 * `getUserMedia`.
 */
export async function queryCameraPermission(): Promise<CameraPermissionState> {
  if (!isCameraSupported()) return 'unsupported';
  if (typeof navigator.permissions?.query !== 'function') return 'prompt';
  try {
    const status = await navigator.permissions.query({ name: 'camera' });
    const state = status.state;
    return state === 'granted' || state === 'denied' ? state : 'prompt';
  } catch {
    return 'prompt';
  }
}

/**
 * Pide al navegador el permiso de cámara y devuelve el stream de vídeo.
 *
 * Es la llamada que dispara el diálogo nativo: debe ocurrir siempre desde un
 * gesto del usuario (o en el arranque de la página, que Android Chrome acepta)
 * y nunca en un `useEffect` que se re-ejecute, para no provocar permisos
 * efímeros que el navegador descarta al recargar.
 */
export function requestCameraStream(): Promise<MediaStream> {
  if (!isCameraSupported()) {
    return Promise.reject(new Error(CAMERA_UNSUPPORTED_MESSAGE));
  }
  return navigator.mediaDevices.getUserMedia(CAMERA_VIDEO_CONSTRAINTS);
}

/** Traduce el fallo de `getUserMedia` a un mensaje accionable en español. */
export function resolveCameraErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === CAMERA_UNSUPPORTED_MESSAGE) {
    return CAMERA_UNSUPPORTED_MESSAGE;
  }
  if (error !== null && typeof error === 'object' && 'name' in error) {
    const name = (error as { name: unknown }).name;
    if (typeof name === 'string' && name in CAMERA_ERROR_MESSAGES) {
      return CAMERA_ERROR_MESSAGES[name];
    }
  }
  return CAMERA_GENERIC_MESSAGE;
}