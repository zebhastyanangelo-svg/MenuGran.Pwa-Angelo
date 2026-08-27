import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MerchantAccountListItem } from '../../services/superAdminService';
import { SuperAdminMerchantsPage } from './SuperAdminMerchantsPage';

const serviceMocks = vi.hoisted(() => ({
  createMerchantAccount: vi.fn(),
  listMerchantsWithOwners: vi.fn(),
  deleteMerchant: vi.fn(),
}));

vi.mock('../../services/superAdminService', () => ({
  createMerchantAccount: serviceMocks.createMerchantAccount,
  listMerchantsWithOwners: serviceMocks.listMerchantsWithOwners,
  deleteMerchant: serviceMocks.deleteMerchant,
}));

function buildMerchant(
  overrides: Partial<MerchantAccountListItem> = {},
): MerchantAccountListItem {
  return {
    id: 'm-1',
    name: 'La Pizzería de María',
    rif: 'J-40123456-7',
    status: 'active',
    is_active: true,
    created_at: '2026-08-21T00:00:00.000Z',
    owner_id: 'owner-1',
    owner_email: 'maria@pizzeria.com',
    owner_full_name: 'María Pérez',
    ...overrides,
  };
}

async function submitForm(): Promise<void> {
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText('Nombre del propietario'),
    'Carlos Ruiz',
  );
  await user.type(screen.getByLabelText('C.I.'), 'V-87654321');
  await user.type(screen.getByLabelText('Teléfono'), '04241234567');
  await user.type(
    screen.getByLabelText('Email (credenciales de acceso)'),
    'carlos@arepas.com',
  );
  await user.type(
    screen.getByLabelText('Contraseña inicial'),
    'ClaveTemporal1',
  );
  await user.type(
    screen.getByLabelText('Nombre del negocio (público)'),
    'Arepas El Güero',
  );
  await user.type(screen.getByLabelText('RIF'), 'J-40987654-3');
  await user.click(screen.getByRole('button', { name: /crear negocio/i }));
}

describe('SuperAdminMerchantsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.listMerchantsWithOwners.mockResolvedValue([
      buildMerchant(),
    ]);
    serviceMocks.createMerchantAccount.mockResolvedValue({
      userId: 'user-2',
      merchantId: 'm-2',
      temporaryPassword: 'TempPass123',
    });
    serviceMocks.deleteMerchant.mockResolvedValue(undefined);
  });

  it('renderiza el encabezado del panel y el formulario de alta', async () => {
    render(<SuperAdminMerchantsPage />);

    expect(
      screen.getByRole('heading', { name: /panel de super admin/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/crear nuevo negocio/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(serviceMocks.listMerchantsWithOwners).toHaveBeenCalled();
    });
  });

  it('lista los comercios ya creados con su propietario y estado', async () => {
    render(<SuperAdminMerchantsPage />);

    expect(await screen.findByTestId('merchant-row')).toBeInTheDocument();
    expect(screen.getByText('La Pizzería de María')).toBeInTheDocument();
    expect(
      screen.getByText(/RIF J-40123456-7 · maria@pizzeria\.com · María Pérez/),
    ).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('registra el comercio al enviar el formulario y refresca el listado', async () => {
    let listCallCount = 0;
    serviceMocks.listMerchantsWithOwners.mockImplementation(() => {
      listCallCount += 1;
      return Promise.resolve(
        listCallCount === 1
          ? [buildMerchant()]
          : [
              buildMerchant(),
              buildMerchant({
                id: 'm-2',
                name: 'Arepas El Güero',
                rif: 'J-40987654-3',
                owner_email: 'carlos@arepas.com',
                owner_full_name: 'Carlos Ruiz',
              }),
            ],
      );
    });

    render(<SuperAdminMerchantsPage />);
    await screen.findByTestId('merchant-row');

    await submitForm();

    await waitFor(() => {
      const rows = screen.getAllByTestId('merchant-row');
      expect(rows).toHaveLength(2);
      expect(rows[1]).toHaveTextContent('Arepas El Güero');
    });
    expect(serviceMocks.createMerchantAccount).toHaveBeenCalledWith({
      ownerFullName: 'Carlos Ruiz',
      ownerCi: 'V-87654321',
      ownerPhone: '04241234567',
      ownerEmail: 'carlos@arepas.com',
      ownerPassword: 'ClaveTemporal1',
      businessName: 'Arepas El Güero',
      businessRif: 'J-40987654-3',
    });
  });

  it('informa la contraseña temporal tras crear el comercio', async () => {
    render(<SuperAdminMerchantsPage />);
    await screen.findByTestId('merchant-row');

    await submitForm();

    expect(await screen.findByTestId('creation-success')).toHaveTextContent(
      'Comercio creado. Contraseña temporal:',
    );
  });

  it('muestra un mensaje de error si la creación falla', async () => {
    serviceMocks.createMerchantAccount.mockRejectedValue(
      new Error('Error al crear el comercio: duplicate slug'),
    );

    render(<SuperAdminMerchantsPage />);
    await screen.findByTestId('merchant-row');

    await submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error al crear el comercio: duplicate slug',
    );
  });

  it('muestra el estado vacío cuando no existen comercios', async () => {
    serviceMocks.listMerchantsWithOwners.mockResolvedValue([]);

    render(<SuperAdminMerchantsPage />);

    expect(
      await screen.findByText(/aún no hay negocios registrados/i),
    ).toBeInTheDocument();
  });

  describe('eliminación de comercios', () => {
    async function openDeleteModal(): Promise<void> {
      const user = userEvent.setup();
      await user.click(await screen.findByTestId('delete-merchant'));
    }

    beforeEach(() => {
      serviceMocks.deleteMerchant.mockResolvedValue(undefined);
    });

    it('muestra el botón de eliminar con icono de peligro por cada negocio', async () => {
      serviceMocks.listMerchantsWithOwners.mockResolvedValue([
        buildMerchant(),
        buildMerchant({ id: 'm-2', owner_id: 'owner-2', name: 'Arepas El Güero' }),
      ]);

      render(<SuperAdminMerchantsPage />);

      const buttons = await screen.findAllByTestId('delete-merchant');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveAttribute('aria-label', 'Eliminar La Pizzería de María');
    });

    it('muestra el modal de confirmación con el nombre del negocio al pulsar eliminar', async () => {
      render(<SuperAdminMerchantsPage />);
      await screen.findByTestId('merchant-row');

      await openDeleteModal();

      const message = screen.getByTestId('delete-confirmation-message');
      expect(message).toHaveTextContent(
        /¿Estás seguro de que deseas eliminar La Pizzería de María\?/,
      );
      expect(message).toHaveTextContent(
        'Esta acción borrará el comercio y la cuenta del propietario permanentemente.',
      );
    });

    it('no elimina nada al cancelar la confirmación', async () => {
      render(<SuperAdminMerchantsPage />);
      await screen.findByTestId('merchant-row');

      const user = userEvent.setup();
      await user.click(await screen.findByTestId('delete-merchant'));
      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(serviceMocks.deleteMerchant).not.toHaveBeenCalled();
      expect(screen.queryByText(/¿Estás seguro de que deseas eliminar/i)).not.toBeInTheDocument();
    });

    it('elimina el comercio, cierra el modal y refresca el listado al confirmar', async () => {
      let listCallCount = 0;
      serviceMocks.listMerchantsWithOwners.mockImplementation(() => {
        listCallCount += 1;
        return Promise.resolve(listCallCount === 1 ? [buildMerchant()] : []);
      });

      render(<SuperAdminMerchantsPage />);
      await screen.findByTestId('merchant-row');

      const user = userEvent.setup();
      await user.click(screen.getByTestId('delete-merchant'));
      await user.click(screen.getByTestId('confirm-delete'));

      expect(serviceMocks.deleteMerchant).toHaveBeenCalledWith('m-1', 'owner-1');
      expect(
        await screen.findByText(/aún no hay negocios registrados/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('delete-confirmation-message'),
      ).not.toBeInTheDocument();
    });

    it('muestra un error dentro del modal si la eliminación falla', async () => {
      serviceMocks.deleteMerchant.mockRejectedValue(
        new Error('Error al eliminar el comercio: row level security'),
      );

      render(<SuperAdminMerchantsPage />);
      await screen.findByTestId('merchant-row');

      const user = userEvent.setup();
      await user.click(screen.getByTestId('delete-merchant'));
      await user.click(screen.getByTestId('confirm-delete'));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Error al eliminar el comercio: row level security',
      );
      expect(
        screen.queryByTestId('delete-confirmation-message'),
      ).toBeInTheDocument();
    });
  });
});
