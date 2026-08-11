import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { ReloadPrompt } from './ReloadPrompt';

const mockUsePwaUpdate = vi.fn();
const mockUsePwaInstall = vi.fn();

vi.mock('../../hooks/usePwaUpdate', () => ({
  usePwaUpdate: () => mockUsePwaUpdate(),
  usePwaInstall: () => mockUsePwaInstall(),
}));

function setupPwaMocks(overrides: {
  isUpdateAvailable?: boolean;
  isOfflineReady?: boolean;
  canInstall?: boolean;
  isInstalled?: boolean;
}) {
  mockUsePwaUpdate.mockReturnValue({
    isUpdateAvailable: overrides.isUpdateAvailable ?? false,
    isOfflineReady: overrides.isOfflineReady ?? false,
    updateServiceWorker: vi.fn().mockResolvedValue(undefined),
    closePrompt: vi.fn(),
  });
  mockUsePwaInstall.mockReturnValue({
    canInstall: overrides.canInstall ?? false,
    isInstalled: overrides.isInstalled ?? false,
    promptInstall: vi.fn().mockResolvedValue(undefined),
  });
}

describe('ReloadPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPwaMocks({});
  });

  afterEach(() => {
    cleanup();
  });

  it('no renderiza nada cuando no hay actualización ni instalación disponible', () => {
    setupPwaMocks({ isUpdateAvailable: false, isOfflineReady: false, canInstall: false });

    const { container } = render(<ReloadPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza el banner de actualización cuando hay una nueva versión', () => {
    setupPwaMocks({ isUpdateAvailable: true });

    render(<ReloadPrompt />);

    expect(
      screen.getByText(/nueva versión disponible/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /actualizar la aplicación/i }),
    ).toBeInTheDocument();
  });

  it('llama a updateServiceWorker al pulsar el botón Actualizar', async () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
    mockUsePwaUpdate.mockReturnValue({
      isUpdateAvailable: true,
      isOfflineReady: false,
      updateServiceWorker,
      closePrompt: vi.fn(),
    });
    mockUsePwaInstall.mockReturnValue({
      canInstall: false,
      isInstalled: false,
      promptInstall: vi.fn().mockResolvedValue(undefined),
    });

    render(<ReloadPrompt />);

    const updateButton = screen.getByRole('button', {
      name: /actualizar la aplicación/i,
    });

    await act(async () => {
      fireEvent.click(updateButton);
    });

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('llama a closePrompt al pulsar el botón de cerrar', () => {
    const closePrompt = vi.fn();
    mockUsePwaUpdate.mockReturnValue({
      isUpdateAvailable: true,
      isOfflineReady: false,
      updateServiceWorker: vi.fn().mockResolvedValue(undefined),
      closePrompt,
    });
    mockUsePwaInstall.mockReturnValue({
      canInstall: false,
      isInstalled: false,
      promptInstall: vi.fn().mockResolvedValue(undefined),
    });

    render(<ReloadPrompt />);

    const closeButton = screen.getByRole('button', { name: /cerrar aviso/i });

    act(() => {
      fireEvent.click(closeButton);
    });

    expect(closePrompt).toHaveBeenCalledTimes(1);
  });

  it('renderiza el banner offline cuando la app está lista sin conexión', () => {
    setupPwaMocks({ isOfflineReady: true });

    render(<ReloadPrompt />);

    expect(
      screen.getByText(/listo para funcionar sin conexión/i),
    ).toBeInTheDocument();
  });

  it('renderiza el botón de instalación cuando canInstall es true', () => {
    setupPwaMocks({ canInstall: true });

    render(<ReloadPrompt />);

    expect(
      screen.getByRole('button', { name: /instalar menugram/i }),
    ).toBeInTheDocument();
  });

  it('llama a promptInstall al pulsar el botón Instalar', async () => {
    const promptInstall = vi.fn().mockResolvedValue(undefined);
    mockUsePwaUpdate.mockReturnValue({
      isUpdateAvailable: false,
      isOfflineReady: false,
      updateServiceWorker: vi.fn().mockResolvedValue(undefined),
      closePrompt: vi.fn(),
    });
    mockUsePwaInstall.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall,
    });

    render(<ReloadPrompt />);

    const installButton = screen.getByRole('button', {
      name: /instalar menugram/i,
    });

    await act(async () => {
      fireEvent.click(installButton);
    });

    expect(promptInstall).toHaveBeenCalledTimes(1);
  });

  it('muestra el mensaje de instalación cuando solo canInstall es true', () => {
    setupPwaMocks({ canInstall: true });

    render(<ReloadPrompt />);

    expect(
      screen.getByText(/instala menugram en tu dispositivo/i),
    ).toBeInTheDocument();
  });
});
