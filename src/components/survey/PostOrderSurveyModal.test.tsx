import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostOrderSurveyModal } from './PostOrderSurveyModal';
import type { OrderRow } from '../../types/database';
import { getSurveyCompletionState } from '../../utils/surveyStorage';

const submitMock = vi.hoisted(() => ({ submitOrderRating: vi.fn() }));
const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock('../../services/orderRatingService', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../services/orderRatingService')
  >();
  return {
    ...actual,
    submitOrderRating: submitMock.submitOrderRating,
  };
});

vi.mock('../../components/pwa/useNotificationToast', () => ({
  useNotificationToast: () => ({ showToast: toastMock.showToast }),
}));

function buildOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1234',
    merchant_id: 'merchant-1',
    customer_id: 'customer-1',
    driver_id: 'driver-1',
    type: 'delivery',
    status: 'delivered',
    payment_method: 'cash',
    payment_reference: null,
    payment_proof_url: null,
    total_amount: '25.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    delivery_address: null,
    latitude: null,
    longitude: null,
    items: [],
    created_at: '2026-10-09T12:00:00Z',
    ...overrides,
  };
}

describe('PostOrderSurveyModal', () => {
  const userEventInstance = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    submitMock.submitOrderRating.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('muestra el paso del negocio primero con el total de pasos', () => {
    render(<PostOrderSurveyModal order={buildOrder()} onClose={vi.fn()} />);

    expect(screen.getByText('¿Cómo estuvo el negocio?')).toBeInTheDocument();
    expect(screen.getByTestId('survey-step-progress')).toHaveTextContent(
      'Paso 1 de 3',
    );
  });

  it('omite el paso de delivery en pedidos de retiro', () => {
    render(
      <PostOrderSurveyModal
        order={buildOrder({ type: 'pickup', driver_id: null })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('survey-step-progress')).toHaveTextContent(
      'Paso 1 de 2',
    );
  });

  it('exige las estrellas del negocio antes de continuar', async () => {
    render(<PostOrderSurveyModal order={buildOrder()} onClose={vi.fn()} />);

    await userEventInstance.click(screen.getByTestId('survey-primary-action'));

    expect(
      screen.getByTestId('survey-error'),
    ).toHaveTextContent(/Califica al negocio con estrellas/);
    expect(submitMock.submitOrderRating).not.toHaveBeenCalled();
  });

  it('recorre los pasos secuenciales y envía la encuesta completa', async () => {
    const onClose = vi.fn();
    render(<PostOrderSurveyModal order={buildOrder()} onClose={onClose} />);

    // Paso 1: negocio.
    await userEventInstance.click(screen.getByTestId('star-5'));
    await userEventInstance.click(screen.getByTestId('chip-merchant-speed-muy_rapido'));
    await userEventInstance.click(screen.getByTestId('chip-merchant-quality-muy_bueno'));
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));

    // Paso 2: repartidor (nota baja para validar la alerta en el submit).
    expect(screen.getByText('¿Cómo estuvo el repartidor?')).toBeInTheDocument();
    await userEventInstance.click(screen.getByTestId('star-2'));
    await userEventInstance.click(screen.getByTestId('chip-driver-speed-normal'));
    await userEventInstance.click(screen.getByTestId('chip-driver-treatment-normal'));
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));

    // Paso 3: plataforma, con mejora "otro" que habilita el comentario.
    expect(screen.getByText('¿Cómo estuvo MenuGran?')).toBeInTheDocument();
    await userEventInstance.click(screen.getByTestId('star-4'));
    await userEventInstance.click(screen.getByTestId('improvement-velocidad'));
    await userEventInstance.click(screen.getByTestId('improvement-otro'));
    await userEventInstance.type(screen.getByTestId('survey-comment'), 'Falta más variedad');
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));

    await waitFor(() => {
      expect(submitMock.submitOrderRating).toHaveBeenCalledTimes(1);
    });

    const [order, answers, steps] = submitMock.submitOrderRating.mock.calls[0];
    expect(order.id).toBe('order-1234');
    expect(answers).toMatchObject({
      merchantStars: 5,
      merchantSpeed: 'muy_rapido',
      merchantServiceQuality: 'muy_bueno',
      driverStars: 2,
      driverSpeed: 'normal',
      driverTreatment: 'normal',
      platformStars: 4,
      platformImprovements: ['velocidad', 'otro'],
      platformComment: 'Falta más variedad',
    });
    expect(steps).toEqual(['business', 'delivery', 'platform']);

    // Confirma con toast y cierra el modal.
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(toastMock.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '¡Gracias por tu calificación!' }),
    );
    expect(getSurveyCompletionState('order-1234')).toBe('answered');
  });

  it('exige comentario al elegir la opción "otro"', async () => {
    render(
      <PostOrderSurveyModal
        order={buildOrder({ type: 'pickup', driver_id: null })}
        onClose={vi.fn()}
      />,
    );

    await userEventInstance.click(screen.getByTestId('star-5'));
    await userEventInstance.click(screen.getByTestId('chip-merchant-speed-normal'));
    await userEventInstance.click(screen.getByTestId('chip-merchant-quality-bueno'));
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));

    await userEventInstance.click(screen.getByTestId('star-3'));
    await userEventInstance.click(screen.getByTestId('improvement-otro'));
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));

    expect(screen.getByTestId('survey-error')).toHaveTextContent(/opción "Otro"/);
    expect(submitMock.submitOrderRating).not.toHaveBeenCalled();
  });

  it('la encuesta es obligatoria: sin "Ahora no", sin "X", sin cierre por backdrop ni Escape', async () => {
    const onClose = vi.fn();
    render(<PostOrderSurveyModal order={buildOrder()} onClose={onClose} />);

    // Sin botón de aplazar/cancelar ni "X" de cerrar en el encabezado.
    expect(screen.queryByTestId('survey-dismiss')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrar/i })).not.toBeInTheDocument();

    // Clic en el backdrop (el propio <dialog>) no cierra el modal.
    const dialog = screen.getByRole('dialog');
    await userEventInstance.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    // Escape tampoco cierra el modal.
    await userEventInstance.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    expect(getSurveyCompletionState('order-1234')).toBeNull();
    expect(submitMock.submitOrderRating).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor sin cerrar el modal', async () => {
    submitMock.submitOrderRating.mockRejectedValue(
      new Error('No se pudo guardar tu calificación: rls denied'),
    );
    const onClose = vi.fn();
    render(
      <PostOrderSurveyModal
        order={buildOrder({ type: 'pickup', driver_id: null })}
        onClose={onClose}
      />,
    );

    await userEventInstance.click(screen.getByTestId('star-5'));
    await userEventInstance.click(screen.getByTestId('chip-merchant-speed-normal'));
    await userEventInstance.click(screen.getByTestId('chip-merchant-quality-bueno'));
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));
    await userEventInstance.click(screen.getByTestId('star-5'));
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));

    await waitFor(() => {
      expect(screen.getByTestId('survey-error')).toHaveTextContent(/rls denied/);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('permite enviar la encuesta de plataforma sin opciones de mejora', async () => {
    render(
      <PostOrderSurveyModal
        order={buildOrder({ type: 'pickup', driver_id: null })}
        onClose={vi.fn()}
      />,
    );

    await userEventInstance.click(screen.getByTestId('star-4'));
    await userEventInstance.click(screen.getByTestId('chip-merchant-speed-rapido'));
    await userEventInstance.click(screen.getByTestId('chip-merchant-quality-normal'));
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));
    await userEventInstance.click(screen.getByTestId('star-4'));
    await userEventInstance.click(screen.getByTestId('survey-primary-action'));

    await waitFor(() => {
      expect(submitMock.submitOrderRating).toHaveBeenCalledTimes(1);
    });

    const answers = submitMock.submitOrderRating.mock.calls[0][1];
    expect(answers.platformImprovements).toEqual([]);
    expect(answers.platformComment).toBeNull();
  });
});
