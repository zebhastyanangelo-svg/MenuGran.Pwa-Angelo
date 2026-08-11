import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import {
  NotificationToastProvider,
  useNotificationToast,
  NotificationToastList,
} from './NotificationToast';

const TestConsumer = () => {
  const { showToast, hideToast, toasts } = useNotificationToast();

  return (
    <div>
      <button
        data-testid="show-toast"
        onClick={() =>
          showToast({
            title: 'Estado actualizado',
            message: 'Tu pedido está en camino',
            variant: 'info',
            durationMs: 0,
          })
        }
      >
        Mostrar Toast
      </button>
      <button
        data-testid="show-success"
        onClick={() =>
          showToast({
            title: '¡Listo!',
            message: 'Tu pedido está listo',
            variant: 'success',
            durationMs: 0,
          })
        }
      >
        Mostrar Success
      </button>
      <button
        data-testid="hide-toast"
        onClick={() => {
          if (toasts.length > 0) {
            hideToast(toasts[0].id);
          }
        }}
      >
        Ocultar Toast
      </button>
      <span data-testid="toast-count">{toasts.length}</span>
      <NotificationToastList />
    </div>
  );
};

function renderWithProvider() {
  return render(
    <NotificationToastProvider>
      <TestConsumer />
    </NotificationToastProvider>,
  );
}

describe('NotificationToastProvider', () => {
  it('inicia con cero toasts', () => {
    renderWithProvider();
    expect(screen.getByTestId('toast-count').textContent).toBe('0');
  });

  it('muestra un toast al llamar showToast', () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByTestId('show-toast'));
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('1');
    expect(screen.getByText('Estado actualizado')).toBeInTheDocument();
    expect(screen.getByText('Tu pedido está en camino')).toBeInTheDocument();
  });

  it('muestra múltiples toasts', () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByTestId('show-toast'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('show-success'));
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('2');
    expect(screen.getByText('Estado actualizado')).toBeInTheDocument();
    expect(screen.getByText('¡Listo!')).toBeInTheDocument();
  });

  it('oculta un toast al llamar hideToast', () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByTestId('show-toast'));
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('1');

    act(() => {
      fireEvent.click(screen.getByTestId('hide-toast'));
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('0');
    expect(screen.queryByText('Estado actualizado')).not.toBeInTheDocument();
  });

  it('auto-oculta el toast después del durationMs configurado', () => {
    vi.useFakeTimers();

    const AutoHideConsumer = () => {
      const { showToast, toasts } = useNotificationToast();

      return (
        <div>
          <button
            data-testid="show-auto-hide"
            onClick={() =>
              showToast({
                title: 'Auto hide',
                message: 'Desaparece en 3s',
                variant: 'info',
                durationMs: 3000,
              })
            }
          >
            Mostrar
          </button>
          <span data-testid="toast-count">{toasts.length}</span>
          <NotificationToastList />
        </div>
      );
    };

    render(
      <NotificationToastProvider>
        <AutoHideConsumer />
      </NotificationToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('show-auto-hide'));
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('1');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('0');

    vi.useRealTimers();
  });

  it('permite cerrar un toast manualmente con el botón de cerrar', () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByTestId('show-toast'));
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('1');

    const closeButton = screen.getByRole('button', { name: /cerrar notificación/i });
    act(() => {
      fireEvent.click(closeButton);
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('0');
  });

  it('lanza error al usar useNotificationToast fuera del provider', () => {
    const originalError = console.error;
    console.error = vi.fn();

    let threw = false;
    try {
      render(<TestConsumer />);
    } catch {
      threw = true;
    }

    console.error = originalError;
    expect(threw).toBe(true);
  });
});
