import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

function stubOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
    writable: true,
  });
}

describe('OfflineBanner', () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    stubOnLine(originalOnLine);
    cleanup();
  });

  it('no renderiza nada cuando está conectado', () => {
    stubOnLine(true);

    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza el banner en modo sin conexión', () => {
    stubOnLine(false);

    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.getByText(/modo sin conexión/i),
    ).toBeInTheDocument();
  });

  it('muestra el mensaje descriptivo cuando está offline', () => {
    stubOnLine(false);

    render(<OfflineBanner />);

    expect(
      screen.getByText(/algunos datos pueden no estar actualizados/i),
    ).toBeInTheDocument();
  });

  it('toma el icono WifiOff', () => {
    stubOnLine(false);

    render(<OfflineBanner />);

    const banner = screen.getByRole('status');
    expect(banner.querySelector('svg')).not.toBeNull();
  });

  it('desaparece al recuperarse la conexión (evento online)', () => {
    stubOnLine(false);

    const { container, rerender } = render(<OfflineBanner />);

    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    rerender(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
