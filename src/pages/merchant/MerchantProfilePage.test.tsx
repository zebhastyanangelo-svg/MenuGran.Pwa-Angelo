import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MerchantProfilePage } from './MerchantProfilePage';
import type { MerchantContext, StaffListItem } from '../../services/merchantStaffService';

const serviceMocks = vi.hoisted(() => ({
  getMerchantContext: vi.fn(),
  listStaff: vi.fn(),
  createEmployee: vi.fn(),
  setStaffActive: vi.fn(),
  deleteStaff: vi.fn(),
  fetchMerchantMetrics: vi.fn(),
}));

vi.mock('../../services/merchantStaffService', () => ({
  getMerchantContext: serviceMocks.getMerchantContext,
  listStaff: serviceMocks.listStaff,
  createEmployee: serviceMocks.createEmployee,
  setStaffActive: serviceMocks.setStaffActive,
  deleteStaff: serviceMocks.deleteStaff,
  fetchMerchantMetrics: serviceMocks.fetchMerchantMetrics,
}));

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: authMocks.useAuth,
}));

const context: MerchantContext = {
  merchantId: 'm-1',
  merchantName: 'La Pizzería de María',
  isOwner: true,
};

const staffMember: StaffListItem = {
  id: 's-1',
  userId: 'u-9',
  fullName: 'Carlos Ruiz',
  email: 'carlos@pizzeria.com',
  permissions: {
    can_manage_menu: true,
    can_view_orders: true,
    can_manage_orders: false,
  },
  isActive: true,
};

describe('MerchantProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.useAuth.mockReturnValue({
      user: { id: 'owner-1' },
      profile: { role: 'merchant_owner' },
      isLoading: false,
    });
    serviceMocks.getMerchantContext.mockResolvedValue(context);
    serviceMocks.listStaff.mockResolvedValue([staffMember]);
    serviceMocks.fetchMerchantMetrics.mockResolvedValue({
      totalSales: 350.5,
      ordersToday: 3,
      activeProducts: 7,
    });
    serviceMocks.createEmployee.mockResolvedValue('staff-new');
    serviceMocks.setStaffActive.mockResolvedValue(undefined);
    serviceMocks.deleteStaff.mockResolvedValue(undefined);
  });

  it('muestra las tarjetas de métricas del comercio', async () => {
    render(<MerchantProfilePage />);

    expect(
      await screen.findByTestId('merchant-metrics', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('metric-total-sales')).toHaveTextContent('$350,5');
    expect(screen.getByTestId('metric-orders-today')).toHaveTextContent('3');
    expect(screen.getByTestId('metric-active-products')).toHaveTextContent('7');
  });

  it('lista los empleados con estado y badges de permisos', async () => {
    render(<MerchantProfilePage />);

    const row = await screen.findByTestId('staff-row', undefined, { timeout: 5000 });
    expect(row).toHaveTextContent('Carlos Ruiz');
    expect(row).toHaveTextContent('carlos@pizzeria.com');
    expect(row).toHaveTextContent('Gestión de menú');
    expect(row).toHaveTextContent('Ver pedidos');
  });

  it('muestra el mensaje de error cuando la carga falla', async () => {
    serviceMocks.listStaff.mockRejectedValue(
      new Error('Error al cargar los empleados: rls denied'),
    );

    render(<MerchantProfilePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error al cargar los empleados: rls denied',
    );
  });

  describe('alta de empleados', () => {
    async function openModalAndFill(): Promise<void> {
      const user = userEvent.setup();
      render(<MerchantProfilePage />);
      await user.click(
        await screen.findByTestId('open-add-employee', undefined, {
          timeout: 5000,
        }),
      );
      await user.type(screen.getByLabelText('Nombre completo'), 'Ana Gómez');
      await user.type(
        screen.getByLabelText('Correo electrónico'),
        'ana@pizzeria.com',
      );
      await user.type(screen.getByLabelText('Contraseña inicial'), 'Clave123');
    }

    it('abre el modal con los campos requeridos y checkboxes de permisos', async () => {
      await openModalAndFill();

      expect(screen.getByTestId('permission-orders')).not.toBeChecked();
      expect(screen.getByTestId('permission-menu')).not.toBeChecked();
    });

    it('crea al empleado vía el Edge Function y refresca el listado', async () => {
      const user = userEvent.setup();
      await openModalAndFill();

      await user.click(screen.getByTestId('permission-menu'));
      await user.click(screen.getByTestId('confirm-add-employee'));

      await waitFor(() => {
        expect(serviceMocks.createEmployee).toHaveBeenCalledWith('m-1', {
          fullName: 'Ana Gómez',
          email: 'ana@pizzeria.com',
          password: 'Clave123',
          permissions: { can_manage_orders: false, can_manage_menu: true },
        });
      });
      expect(serviceMocks.listStaff).toHaveBeenCalledTimes(2);
      expect(
        screen.queryByRole('form', { name: /formulario de alta de empleado/i }),
      ).not.toBeInTheDocument();
    });

    it('muestra un error de validación sin llamar al servicio', async () => {
      const user = userEvent.setup();
      await openModalAndFill();
      await user.clear(screen.getByLabelText('Nombre completo'));
      await user.click(screen.getByTestId('confirm-add-employee'));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'El nombre completo es obligatorio.',
      );
      expect(serviceMocks.createEmployee).not.toHaveBeenCalled();
    });

    it('muestra el error devuelto por el Edge Function', async () => {
      serviceMocks.createEmployee.mockRejectedValue(
        new Error('Error al crear el empleado: email already registered'),
      );
      const user = userEvent.setup();
      await openModalAndFill();

      await user.click(screen.getByTestId('confirm-add-employee'));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Error al crear el empleado: email already registered',
      );
    });
  });

  describe('revocar y eliminar empleados', () => {
    it('revoca el acceso del empleado', async () => {
      const user = userEvent.setup();
      render(<MerchantProfilePage />);
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('revoke-staff-s-1'));

      await waitFor(() => {
        expect(serviceMocks.setStaffActive).toHaveBeenCalledWith('s-1', false);
      });
      expect(await screen.findByText(/acceso revocado/i)).toBeInTheDocument();
    });

    it('elimina al empleado del listado', async () => {
      const user = userEvent.setup();
      render(<MerchantProfilePage />);
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('delete-staff-s-1'));

      await waitFor(() => {
        expect(serviceMocks.deleteStaff).toHaveBeenCalledWith('s-1');
      });
      expect(screen.queryByTestId('staff-row')).not.toBeInTheDocument();
    });
  });

  it('oculta la gestión de empleados para usuarios que no son owner', async () => {
    serviceMocks.getMerchantContext.mockResolvedValue({ ...context, isOwner: false });

    render(<MerchantProfilePage />);

    expect(await screen.findByTestId('staff-list', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(
      screen.queryByTestId('open-add-employee'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('revoke-staff-s-1')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay empleados', async () => {
    serviceMocks.listStaff.mockResolvedValue([]);

    render(<MerchantProfilePage />);

    expect(await screen.findByText(/aún no hay empleados/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });
});
