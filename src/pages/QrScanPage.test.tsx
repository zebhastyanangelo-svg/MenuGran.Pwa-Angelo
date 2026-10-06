import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QrScanPage } from './QrScanPage';

const originalMediaDevices = navigator.mediaDevices;

function setMediaDevices(value: unknown): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    value,
    configurable: true,
    writable: true,
  });
}

function setPermissions(state: string): void {
  Object.defineProperty(navigator, 'permissions', {
    value: { query: vi.fn().mockResolvedValue({ state }) },
    configurable: true,
    writable: true,
  });
}

function installBarcodeDetector(): void {
  Object.defineProperty(window, 'BarcodeDetector', {
    value: class {
      detect(): Promise<{ rawValue: string }[]> {
        return Promise.resolve([{ rawValue: 'https://menugram.app/q/abc123' }]);
      }
    },
    configurable: true,
    writable: true,
  });
}

function createStream(): MediaStream {
  return {
    getTracks: () => [{ stop: vi.fn() }],
  } as unknown as MediaStream;
}

/**
 * jsdom no implementa la reproducción de medios: sin esto el bucle de
 * escaneo se quedaría esperando un frame que nunca llega.
 */
function installPlayableVideo(): void {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    value: vi.fn().mockResolvedValue(undefined),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'readyState', {
    value: 4,
    configurable: true,
    writable: true,
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/scan']}>
      <Routes>
        <Route path="/scan" element={<QrScanPage />} />
        <Route path="/q/:token" element={<p>menu abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QrScanPage — permisos de cámara', () => {
  beforeEach(() => {
    installBarcodeDetector();
    installPlayableVideo();
    setPermissions('prompt');
    setMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(createStream()) });
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  it('solicita el permiso de cámara con la cámara trasera al montar', async () => {
    renderPage();

    await waitFor(() => {
      const getUserMedia = (navigator.mediaDevices as MediaDevices)
        .getUserMedia as ReturnType<typeof vi.fn>;
      expect(getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment' },
        audio: false,
      });
    });
  });

  it('abre el menú con el token leído cuando el permiso se concede', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('menu abierto')).toBeInTheDocument();
    });
  });

  it('informa cuando el permiso es denegado y ofrece reintentar', async () => {
    setPermissions('denied');
    setMediaDevices({
      getUserMedia: vi
        .fn()
        .mockRejectedValue(new DOMException('x', 'NotAllowedError')),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Permiso de cámara denegado')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Reintentar con la cámara/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Permiso de cámara denegado/i);
  });

  it('vuelve a pedir el permiso al pulsar reintentar', async () => {
    setPermissions('denied');
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(new DOMException('x', 'NotAllowedError'));
    setMediaDevices({ getUserMedia });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Permiso de cámara denegado')).toBeInTheDocument();
    });

    const getUserMediaMock = getUserMedia;
    getUserMediaMock.mockResolvedValue(createStream());
    fireEvent.click(screen.getByRole('button', { name: /Reintentar con la cámara/i }));

    await waitFor(() => {
      expect(getUserMediaMock).toHaveBeenCalledTimes(2);
    });
  });

  it('avisa cuando el navegador no expone la API de cámara', async () => {
    setMediaDevices(undefined);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /no permite usar la cámara desde la web/i,
      );
    });
  });

  it('traduce la falta de cámara física a un mensaje legible', async () => {
    setMediaDevices({
      getUserMedia: vi
        .fn()
        .mockRejectedValue(new DOMException('x', 'NotFoundError')),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /No encontramos ninguna cámara/i,
      );
    });
  });

  it('deja escribir el token a mano aunque la cámara falle', async () => {
    setMediaDevices({
      getUserMedia: vi
        .fn()
        .mockRejectedValue(new DOMException('x', 'NotAllowedError')),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/¿Prefieres escribir el código/i), {
      target: { value: 'abc123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Abrir menú/i }));

    await waitFor(() => {
      expect(screen.getByText('menu abierto')).toBeInTheDocument();
    });
  });
});