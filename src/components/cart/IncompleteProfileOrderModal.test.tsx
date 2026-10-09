import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncompleteProfileOrderModal } from './IncompleteProfileOrderModal';

describe('IncompleteProfileOrderModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderModal(overrides: Record<string, unknown> = {}) {
    const props = {
      isOpen: true,
      missingFields: ['Teléfono', 'Cédula de Identidad'],
      onGoToProfile: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    return {
      props,
      rendered: render(<IncompleteProfileOrderModal {...props} />),
    };
  }

  it('explica el bloqueo y lista los campos pendientes', () => {
    renderModal();

    expect(screen.getByText('Completa tu perfil para pedir')).toBeInTheDocument();
    expect(screen.getByText(/No puedes realizar pedidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Falta: Teléfono/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Falta: Cédula de Identidad/i),
    ).toBeInTheDocument();
  });

  it('lleva al perfil al pulsar el botón directo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onGoToProfile = vi.fn();
    renderModal({ onGoToProfile });

    await user.click(screen.getByTestId('go-to-profile-button'));

    expect(onGoToProfile).toHaveBeenCalledTimes(1);
  });

  it('cierra sin redirigir cuando el usuario lo pide', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onGoToProfile = vi.fn();
    const onClose = vi.fn();
    renderModal({ onGoToProfile, onClose });

    await user.click(screen.getByText(/Seguir viendo mi carrito/i));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onGoToProfile).not.toHaveBeenCalled();
  });

  it('redirige automáticamente cuando la cuenta regresiva llega a cero', () => {
    const onGoToProfile = vi.fn();
    renderModal({ onGoToProfile });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onGoToProfile).toHaveBeenCalled();
  });

  it('reinicia la cuenta regresiva al reabrir el modal', () => {
    const onGoToProfile = vi.fn();
    const { rendered } = renderModal({ onGoToProfile });

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    rendered.rerender(
      <IncompleteProfileOrderModal
        isOpen={false}
        missingFields={['Teléfono']}
        onGoToProfile={onGoToProfile}
        onClose={vi.fn()}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Cerrado no redirige, y los timers quedaron limpios.
    expect(onGoToProfile).not.toHaveBeenCalled();

    rendered.rerender(
      <IncompleteProfileOrderModal
        isOpen={true}
        missingFields={['Teléfono']}
        onGoToProfile={onGoToProfile}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId('profile-redirect-countdown'),
    ).toHaveTextContent(/5 s/);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onGoToProfile).toHaveBeenCalledTimes(1);
  });
});
