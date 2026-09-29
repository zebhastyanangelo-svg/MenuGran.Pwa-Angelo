import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkNotificationModal } from './BulkNotificationModal';

const sendBulkPushNotificationMock = vi.fn();

vi.mock('../../services/pushNotificationService', () => ({
  sendBulkPushNotification: (...args: unknown[]) => sendBulkPushNotificationMock(...args),
}));

describe('BulkNotificationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza los campos de título, cuerpo y el botón de envío masivo', () => {
    render(<BulkNotificationModal onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Enviar Notificación Masiva a Clientes/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Título del mensaje/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cuerpo del mensaje/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar Notificación a Todos/i })).toBeInTheDocument();
  });

  it('deshabilita el envío cuando el cuerpo está vacío', () => {
    render(<BulkNotificationModal onClose={vi.fn()} />);

    const sendButton = screen.getByRole('button', { name: /Enviar Notificación a Todos/i });
    expect(sendButton).toBeDisabled();
    expect(sendBulkPushNotificationMock).not.toHaveBeenCalled();
  });

  it('muestra la vista previa con las variables reemplazadas', () => {
    render(<BulkNotificationModal onClose={vi.fn()} />);

    const bodyInput = screen.getByLabelText(/Cuerpo del mensaje/i);
    fireEvent.change(bodyInput, { target: { value: '¡Hola {nombre}! Hoy 2x1 🍔' } });

    expect(screen.getByText('¡Hola María! Hoy 2x1 🍔')).toBeInTheDocument();
  });

  it('envía la notificación masiva con el título y cuerpo al hacer clic', async () => {
    sendBulkPushNotificationMock.mockResolvedValue({
      ok: true,
      summary: { sent: 8, failed: 1, deactivated: 1, total: 9 },
    });
    const onClose = vi.fn();
    render(<BulkNotificationModal onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/Título del mensaje/i), {
      target: { value: 'Promo del día' },
    });
    fireEvent.change(screen.getByLabelText(/Cuerpo del mensaje/i), {
      target: { value: '¡Hola {nombre}, pide tu almuerzo!' },
    });

    const sendButton = screen.getByRole('button', { name: /Enviar Notificación a Todos/i });
    expect(sendButton).toBeEnabled();

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendBulkPushNotificationMock).toHaveBeenCalledWith(
        'Promo del día',
        '¡Hola {nombre}, pide tu almuerzo!',
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/8 entregadas de 9/);
    });
  });

  it('muestra el error controlado si el envío falla', async () => {
    sendBulkPushNotificationMock.mockResolvedValue({
      ok: false,
      message: 'No se pudo enviar la notificación. Intenta nuevamente.',
    });
    render(<BulkNotificationModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Cuerpo del mensaje/i), {
      target: { value: 'Mensaje de prueba' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Notificación a Todos/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo enviar la notificación/i);
    });
  });

  it('cierra el modal con el botón Cancelar y con la X', () => {
    const onClose = vi.fn();
    render(<BulkNotificationModal onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
