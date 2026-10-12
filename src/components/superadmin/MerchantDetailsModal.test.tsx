import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MerchantDetailsModal, formatDetailDate } from './MerchantDetailsModal';

const serviceMocks = vi.hoisted(() => ({
  fetchMerchantDetails: vi.fn(),
  updateMerchantSubscription: vi.fn(),
}));

vi.mock('../../services/superAdminService', () => ({
  fetchMerchantDetails: serviceMocks.fetchMerchantDetails,
  updateMerchantSubscription: serviceMocks.updateMerchantSubscription,
}));

const DETAILS_FIXTURE = {
  id: 'm-1',
  name: 'La Pizzería de María',
  slug: 'la-pizzeria-de-maria',
  rif: 'J-40123456-7',
  status: 'active',
  is_active: true,
  is_open: true,
  category: 'Restaurante',
  description: 'La mejor pizza de la zona',
  address: 'Av. Principal, C.C. Central, Local 12',
  zone: 'Zona Norte',
  phone_whatsapp: '+58 412-123-4567',
  service_modalities: ['Delivery', 'Retiro en local'],
  business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
  opening_time: '08:00',
  closing_time: '20:00',
  created_at: '2026-08-21T00:00:00.000Z',
};

function renderModal(overrides: Partial<Parameters<typeof MerchantDetailsModal>[0]> = {}) {
  return render(
    <MerchantDetailsModal
      merchantId="m-1"
      merchantName="La Pizzería de María"
      ownerEmail="maria@pizzeria.com"
      ownerFullName="María Pérez"
      createdAt="2026-08-21T00:00:00.000Z"
      isOpen
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe('formatDetailDate', () => {
  it('devuelve un guión para fechas vacías o inválidas', () => {
    expect(formatDetailDate(null)).toBe('—');
    expect(formatDetailDate('no-es-fecha')).toBe('—');
  });
});

describe('MerchantDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.fetchMerchantDetails.mockResolvedValue(DETAILS_FIXTURE);
  });

  it('muestra el RIF, dirección, contacto y categoría del comercio', async () => {
    renderModal();

    expect(
      await screen.findByRole('heading', { name: /Detalles de La Pizzería de María/i }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('merchant-details-rif')).toHaveTextContent(
      'J-40123456-7',
    );
    expect(screen.getByText('Av. Principal, C.C. Central, Local 12')).toBeInTheDocument();
    expect(screen.getByText('+58 412-123-4567')).toBeInTheDocument();
    expect(screen.getByText('Restaurante')).toBeInTheDocument();
    expect(serviceMocks.fetchMerchantDetails).toHaveBeenCalledWith('m-1');
  });

  it('muestra al propietario con sus datos de listado', async () => {
    renderModal();

    await screen.findByTestId('merchant-details-body');
    expect(screen.getByText('María Pérez')).toBeInTheDocument();
    expect(screen.getByText('maria@pizzeria.com')).toBeInTheDocument();
  });

  it('no muestra métricas financieras privadas', async () => {
    renderModal();

    await screen.findByTestId('merchant-details-body');
    expect(screen.queryByText(/ingresos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pedidos totales/i)).not.toBeInTheDocument();
  });

  it('muestra el cargador mientras se consulta la ficha', () => {
    serviceMocks.fetchMerchantDetails.mockReturnValue(new Promise(() => {}));
    renderModal();

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('muestra un error accesible cuando la consulta falla', async () => {
    serviceMocks.fetchMerchantDetails.mockRejectedValue(
      new Error('Error al obtener el comercio: not found'),
    );
    renderModal();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error al obtener el comercio: not found',
    );
  });

  it('muestra el estado activo y la fecha de registro', async () => {
    renderModal();

    expect(await screen.findByText('Activo')).toBeInTheDocument();
    expect(screen.getByText(/Registrado:/)).toBeInTheDocument();
  });

  it('expone el botón de métricas cuando la vista lo solicita', async () => {
    const onViewMetrics = vi.fn();
    renderModal({ onViewMetrics });

    await screen.findByTestId('merchant-details-body');

    await userEvent.click(screen.getByTestId('view-merchant-metrics'));
    expect(onViewMetrics).toHaveBeenCalledTimes(1);
  });

  it('cierra con el botón Cerrar', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    await screen.findByTestId('merchant-details-body');
    await userEvent.click(screen.getByTestId('close-merchant-details'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no consulta la ficha cuando está cerrado', async () => {
    render(<MerchantDetailsModal
      merchantId="m-1"
      merchantName="La Pizzería de María"
      isOpen={false}
      onClose={vi.fn()}
    />);

    await waitFor(() => {
      expect(serviceMocks.fetchMerchantDetails).not.toHaveBeenCalled();
    });
  });
});
