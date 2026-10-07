/**
 * Lector de códigos QR de mesa.
 *
 * Es el destino de la opción "Estoy en el negocio" del onboarding: el cliente
 * está físicamente en el local y escanea el QR impreso para abrir el menú.
 *
 * No se exige sesión: el mismo QR impreso que apunta a `/q/:token` funciona
 * con la cámara nativa del teléfono, así que el lector solo acelera el caso
 * de quien ya tiene la PWA abierta. Por eso el acceso a la cámara es
 * opcional y siempre hay una alternativa manual (escribir/pegar el token).
 *
 * El escaneo usa la API nativa `BarcodeDetector` (Chromium/Android, sin
 * dependencias) y degrada con elegancia donde no existe: Safari y Firefox no
 * la implementan, y en jsdom tampoco está, por eso su disponibilidad se
 * comprueba antes de construir nada.
 *
 * El permiso de cámara se consulta sin diálogo al montar la vista con
 * `permissions.query`; el diálogo nativo solo lo abre `getUserMedia` y los
 * navegadores (Safari iOS incluido) lo rechazan si no nace de un gesto del
 * usuario, así que la petición se dispara exclusivamente desde el botón
 * "Activar la cámara". La única excepción es el arranque automático cuando el
 * permiso ya estaba concedido: ahí no hay diálogo que mostrar y la cámara
 * arranca sola. Los estados que importan se distinguen y se comunican al
 * cliente: `granted` (escaneando), `denied` (hay que actuar desde el candado
 * de la barra de direcciones) y `unsupported` (contexto no seguro o API
 * ausente).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  ScanLine,
  Keyboard,
  CameraOff,
  RefreshCw,
  ShieldOff,
} from 'lucide-react';
import { MERCHANT_QR_PATH } from '../services/qrCodeService';
import {
  CAMERA_UNSUPPORTED_MESSAGE,
  isCameraSupported,
  queryCameraPermission,
  requestCameraStream,
  resolveCameraErrorMessage,
  type CameraPermissionState,
} from '../utils/cameraPermission';
import {
  extractQrToken,
  getBarcodeDetector,
  isBarcodeDetectorSupported,
} from '../utils/qrToken';

export function QrScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // `true` en cuanto `startScanning` se ejecuta (por gesto o por permiso ya
  // concedido). La consulta de permisos del montaje es asíncrona y su
  // resultado puede llegar después: si el cliente ya actuó, su resultado es
  // el autoritativo y no debe sobrescribirse.
  const hasInteractedRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>('prompt');
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');

  const isSupported = isBarcodeDetectorSupported();

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }, []);

  const openToken = useCallback(
    (token: string) => {
      navigate(`${MERCHANT_QR_PATH}/${encodeURIComponent(token)}`);
    },
    [navigate],
  );

  const startScanning = useCallback(async () => {
    hasInteractedRef.current = true;
    const Detector = getBarcodeDetector();
    if (Detector === null) return;

    if (!isCameraSupported()) {
      setPermissionState('unsupported');
      setError(CAMERA_UNSUPPORTED_MESSAGE);
      return;
    }

    setError(null);
    setIsRequesting(true);
    try {
      // `getUserMedia` es lo que abre el diálogo nativo de permisos. Se pide
      // antes de tocar el `<video>` para que el permiso quede concedido (y no
      // efímero) antes de empezar a reproducir el stream.
      const stream = await requestCameraStream();
      streamRef.current = stream;
      setPermissionState('granted');

      const video = videoRef.current;
      if (video !== null) {
        video.srcObject = stream;
        await video.play();
      }

      const detector = new Detector({ formats: ['qr_code'] });
      setIsScanning(true);

      const tick = async (): Promise<void> => {
        const element = videoRef.current;
        if (element === null || element.readyState < 2) {
          requestAnimationFrame(() => void tick());
          return;
        }
        try {
          const codes = await detector.detect(element);
          const token = extractQrToken(codes[0]?.rawValue ?? '');
          if (token !== null) {
            stopStream();
            openToken(token);
            return;
          }
        } catch {
          // Un frame ilegible es normal mientras la cámara enfoca.
        }
        requestAnimationFrame(() => void tick());
      };
      void tick();
    } catch (cameraError: unknown) {
      stopStream();
      // `NotAllowedError` cubre tanto el rechazo explícito como el bloqueo
      // previo en los ajustes del navegador; en ambos casos hay que actuar
      // desde el candado de la barra de direcciones.
      const denied =
        cameraError !== null &&
        typeof cameraError === 'object' &&
        (cameraError as { name?: unknown }).name === 'NotAllowedError';
      setPermissionState(denied ? 'denied' : 'prompt');
      setError(resolveCameraErrorMessage(cameraError));
    } finally {
      setIsRequesting(false);
    }
  }, [openToken, stopStream]);

  // Al montar solo se CONSULTA el permiso (`permissions.query` no muestra
  // diálogo). La cámara se activa sola únicamente si el permiso ya estaba
  // concedido; en cualquier otro caso el diálogo nativo debe nacer del gesto
  // de pulsar "Activar la cámara", porque Safari iOS y varios navegadores de
  // escritorio rechazan con `NotAllowedError` cualquier `getUserMedia`
  // automático — y ese rechazo era el que dejaba la vista clavada en
  // "Permiso de cámara denegado" sin que el cliente hubiera denegado nada.
  useEffect(() => {
    let cancelled = false;
    void queryCameraPermission().then((state) => {
      // Si el cliente ya pulsó el botón, su resultado manda: la consulta del
      // montaje llegó tarde y no debe volver a pintar el estado inicial.
      if (cancelled || hasInteractedRef.current) return;
      setPermissionState(state);
      if (state === 'granted') {
        void startScanning();
      } else if (state === 'unsupported') {
        setError(CAMERA_UNSUPPORTED_MESSAGE);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [startScanning]);

  // La cámara se libera al salir de la vista: dejar el stream vivo consume la
  // batería del dispositivo y mantiene el indicador de grabación encendido.
  useEffect(() => stopStream, [stopStream]);

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const token = extractQrToken(manualToken) ?? manualToken.trim();
    if (!token) {
      setError('Escribe el código que aparece en el QR de la mesa.');
      return;
    }
    openToken(token);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
          <QrCode className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold text-slate-900">Escanea el QR de tu mesa</h1>
        <p className="mt-1 text-sm text-slate-600">
          Apunta la cámara al código QR impreso en la mesa o en la barra del
          commerce para abrir su menú.
        </p>
      </div>

      {isSupported ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Vista de la cámara para escanear el código QR"
              className="aspect-square w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80" />
            {isScanning && (
              <p
                role="status"
                className="absolute inset-x-0 bottom-3 text-center text-xs font-medium text-white"
              >
                Buscando un código QR...
              </p>
            )}
            {!isScanning && isRequesting && (
              <p
                role="status"
                className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs font-medium text-white"
              >
                Abriendo la cámara…
              </p>
            )}
            {!isScanning && !isRequesting && permissionState === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/85 px-6 text-center">
                <CameraOff className="h-6 w-6 text-white" aria-hidden="true" />
                <p className="text-xs font-medium text-white">
                  Permiso de cámara denegado
                </p>
                <p className="text-xs text-slate-300">
                  Actívalo desde el candado de la barra de direcciones y vuelve
                  a intentar.
                </p>
              </div>
            )}
            {!isScanning && !isRequesting && permissionState === 'unsupported' && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/85 px-6 text-center"
                data-testid="camera-unsupported-notice"
              >
                <ShieldOff className="h-6 w-6 text-white" aria-hidden="true" />
                <p className="text-xs font-medium text-white">
                  Cámara no disponible
                </p>
                <p className="text-xs text-slate-300">
                  Abre la PWA en una conexión segura (https) o escribe el
                  código abajo.
                </p>
              </div>
            )}
            {!isScanning && !isRequesting && permissionState !== 'denied' && permissionState !== 'unsupported' && (
              <p
                className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs font-medium text-white/90"
                data-testid="camera-idle-hint"
              >
                Toca «Activar la cámara» para escanear el QR de tu mesa.
              </p>
            )}
          </div>

          {!isScanning && permissionState !== 'unsupported' && (
            <button
              type="button"
              onClick={() => void startScanning()}
              disabled={isRequesting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c80024] disabled:opacity-60"
            >
              {permissionState === 'denied' ? (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ScanLine className="h-4 w-4" aria-hidden="true" />
              )}
              {isRequesting
                ? 'Abriendo cámara…'
                : permissionState === 'denied'
                  ? 'Reintentar con la cámara'
                  : 'Activar la cámara'}
            </button>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este navegador no puede leer códigos QR desde la web. Usa la cámara
          de tu teléfono para abrir el QR impreso, o escribe el código aquí
          abajo.
        </p>
      )}

      <form onSubmit={handleManualSubmit} className="mt-6 space-y-2" noValidate>
        <label
          htmlFor="qr-token"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
        >
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          ¿Prefieres escribir el código?
        </label>
        <input
          id="qr-token"
          type="text"
          value={manualToken}
          onChange={(event) => {
            setManualToken(event.target.value);
            setError(null);
          }}
          placeholder="Código del QR"
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
        <button
          type="submit"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Abrir menú
        </button>
      </form>

      {error !== null && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}