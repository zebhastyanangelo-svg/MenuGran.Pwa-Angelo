import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MerchantSubscriptionManager } from './MerchantSubscriptionManager';

/** Fecha YYYY-MM-DD de hoy desplazada `offsetDays` días (positivo o negativo). */
function dateFromToday(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderManager(overrides: Partial<Parameters<typeof MerchantSubscriptionManager>[0]> = {}) {
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const props = {
    merchantId: 'm-1',
    currentExpiration: null as string | null,
    onUpdate,
    ...overrides,
  };
  render(<MerchantSubscriptionManager {...props} />);
  return { onUpdate, props };
}

describe('MerchantSubscriptionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra "Sin configurar" cuando no hay fecha de expiración', () => {
    renderManager({ currentExpiration: null });

    expect(screen.getByTestId('subscription-days-badge')).toHaveTextContent(
      /Suscripción expirada \/ Sin configurar/i,
    );
  });

  it('muestra el contador de días restantes con estado verde a más de 5 días', () => {
    renderManager({ currentExpiration: dateFromToday(30) });

    expect(screen.getByTestId('subscription-days-badge')).toHaveTextContent(
      '30 días restantes',
    );
  });

  it('muestra estado de advertencia a 5 días o menos', () => {
    renderManager({ currentExpiration: dateFromToday(5) });

    expect(screen.getByTestId('subscription-days-badge')).toHaveTextContent(
      '5 días restantes',
    );
  });

  it('muestra estado expirado cuando la fecha ya pasó', () => {
    renderManager({ currentExpiration: dateFromToday(-5) });

    expect(screen.getByTestId('subscription-days-badge')).toHaveTextContent(
      'Suscripción expirada',
    );
  });

  it('llama a onUpdate con la fecha calculada al asignar el plazo', async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderManager({ currentExpiration: dateFromToday(30) });

    await user.selectOptions(screen.getByTestId('subscription-term-select'), '15');
    await user.click(screen.getByTestId('subscription-assign-button'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('m-1', dateFromToday(15));
    });
  });

  it('usa el plazo por defecto de 30 días si no se cambia el selector', async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderManager();

    await user.click(screen.getByTestId('subscription-assign-button'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('m-1', dateFromToday(30));
    });
  });

  it('muestra un error accesible si onUpdate falla', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockRejectedValue(new Error('RLS denegó la operación'));
    renderManager({ onUpdate });

    await user.click(screen.getByTestId('subscription-assign-button'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'RLS denegó la operación',
    );
  });
});
