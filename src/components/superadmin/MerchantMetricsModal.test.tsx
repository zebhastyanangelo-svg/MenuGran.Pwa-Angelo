import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MerchantMetricsModal } from './MerchantMetricsModal';
import { formatCurrency } from '../../utils/format';
import type { MerchantMetrics } from '../../services/merchantMetricsService';

const mockHook = vi.hoisted(() => ({
  useMerchantMetrics: vi.fn(),
}));

vi.mock('../../hooks/useMerchantMetrics', () => ({
  useMerchantMetrics: mockHook.useMerchantMetrics,
}));

const sampleMetrics: MerchantMetrics = {
  totalRevenue: 400.5,
  totalOrders: 3,
  completedOrders: 2,
  cancelledOrders: 1,
  averageTicket: 200.25,
  activityLevel: 'Alta',
  ordersLast30Days: 25,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MerchantMetricsModal', () => {
  it('no muestra el cuerpo cuando el modal está cerrado', () => {
    mockHook.useMerchantMetrics.mockReturnValue({
      metrics: null,
      isLoading: false,
      error: null,
    });

    render(
      <MerchantMetricsModal
        merchantId=""
        merchantName=""
        isOpen={false}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Ingresos procesados')).not.toBeInTheDocument();
  });

  it('muestra esqueletos mientras carga', () => {
    mockHook.useMerchantMetrics.mockReturnValue({
      metrics: null,
      isLoading: true,
      error: null,
    });

    render(
      <MerchantMetricsModal
        merchantId="merchant-1"
        merchantName="La Pizzería"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('status', { hidden: true }).length).toBeGreaterThan(0);
  });

  it('muestra el error del servicio cuando falla la consulta', () => {
    mockHook.useMerchantMetrics.mockReturnValue({
      metrics: null,
      isLoading: false,
      error: 'Error al obtener pedidos del comercio: rls denied',
    });

    render(
      <MerchantMetricsModal
        merchantId="merchant-1"
        merchantName="La Pizzería"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Error al obtener pedidos del comercio: rls denied',
    );
  });

  it('muestra las métricas del comercio al abrir el modal', () => {
    mockHook.useMerchantMetrics.mockReturnValue({
      metrics: sampleMetrics,
      isLoading: false,
      error: null,
    });

    render(
      <MerchantMetricsModal
        merchantId="merchant-1"
        merchantName="La Pizzería de María"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /Métricas de La Pizzería de María/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresos procesados')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(400.5))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(200.25))).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Alta (25 en 30 días)')).toBeInTheDocument();
  });

  it('invoca onClose al pulsar el botón de cierre del footer', async () => {
    const onClose = vi.fn();
    mockHook.useMerchantMetrics.mockReturnValue({
      metrics: sampleMetrics,
      isLoading: false,
      error: null,
    });

    render(
      <MerchantMetricsModal
        merchantId="merchant-1"
        merchantName="La Pizzería"
        isOpen={true}
        onClose={onClose}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId('close-metrics-modal'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al pulsar la tecla Escape (botón de cierre accesible del Modal)', () => {
    const onClose = vi.fn();
    mockHook.useMerchantMetrics.mockReturnValue({
      metrics: sampleMetrics,
      isLoading: false,
      error: null,
    });

    render(
      <MerchantMetricsModal
        merchantId="merchant-1"
        merchantName="La Pizzería"
        isOpen={true}
        onClose={onClose}
      />,
    );

    const dialog = document.body.querySelector('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.open).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
