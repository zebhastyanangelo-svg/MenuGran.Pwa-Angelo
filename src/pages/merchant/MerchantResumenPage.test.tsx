import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MerchantResumenPage } from './MerchantResumenPage';
import type { MerchantContext, StaffListItem } from '../../services/merchantStaffService';
import type { MerchantAnalytics } from '../../services/merchantAnalyticsService';

const serviceMocks = vi.hoisted(() => ({
  getMerchantContext: vi.fn(),
  listStaff: vi.fn(),
  createEmployee: vi.fn(),
  setStaffActive: vi.fn(),
  deleteStaff: vi.fn(),
  fetchMerchantMetrics: vi.fn(),
  updateStaffPermissions: vi.fn(),
}));

vi.mock('../../services/merchantStaffService', () => ({
  getMerchantContext: serviceMocks.getMerchantContext,
  listStaff: serviceMocks.listStaff,
  createEmployee: serviceMocks.createEmployee,
  setStaffActive: serviceMocks.setStaffActive,
  deleteStaff: serviceMocks.deleteStaff,
  fetchMerchantMetrics: serviceMocks.fetchMerchantMetrics,
  updateStaffPermissions: serviceMocks.updateStaffPermissions,
}));

const analyticsMocks = vi.hoisted(() => ({
  fetchMerchantAnalytics: vi.fn(),
}));

vi.mock('../../services/merchantAnalyticsService', () => ({
  fetchMerchantAnalytics: analyticsMocks.fetchMerchantAnalytics,
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

const defaultStaffMember: StaffListItem = {
  id: 's-1',
  userId: 'u-9',
  fullName: 'Carlos Ruiz',
  email: 'carlos@pizzeria.com',
  permissions: {
    can_manage_menu: true,
    can_view_orders: true,
    can_manage_orders: false,
    can_manage_settings: false,
    can_view_metrics: true,
  },
  isActive: true,
};

const defaultAnalytics: MerchantAnalytics = {
  dailyRevenue: [
    { date: '2026-08-22', revenue: 100 },
    { date: '2026-08-23', revenue: 200 },
    { date: '2026-08-24', revenue: 150 },
  ],
  statusBreakdown: [
    { status: 'delivered', label: 'Completados', count: 3, color: '#10B981' },
    { status: 'in_process', label: 'En proceso', count: 2, color: '#F59E0B' },
    { status: 'cancelled', label: 'Cancelados', count: 1, color: '#EF4444' },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <MerchantResumenPage />
    </MemoryRouter>,
  );
}

describe('MerchantResumenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.useAuth.mockReturnValue({
      user: { id: 'owner-1' },
      profile: { role: 'merchant_owner' },
      isLoading: false,
    });
    serviceMocks.getMerchantContext.mockResolvedValue(context);
    serviceMocks.listStaff.mockResolvedValue([defaultStaffMember]);
    serviceMocks.fetchMerchantMetrics.mockResolvedValue({
      totalSales: 350.5,
      ordersToday: 3,
      activeProducts: 7,
    });
    analyticsMocks.fetchMerchantAnalytics.mockResolvedValue(defaultAnalytics);
    serviceMocks.createEmployee.mockResolvedValue('staff-new');
    serviceMocks.setStaffActive.mockResolvedValue(undefined);
    serviceMocks.deleteStaff.mockResolvedValue(undefined);
    serviceMocks.updateStaffPermissions.mockResolvedValue(undefined);
  });

  it('muestra las tarjetas de métricas del comercio', async () => {
    renderPage();

    expect(
      await screen.findByTestId('merchant-metrics', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('metric-total-sales')).toHaveTextContent('$350,5');
    expect(screen.getByTestId('metric-orders-today')).toHaveTextContent('3');
    expect(screen.getByTestId('metric-active-products')).toHaveTextContent('7');
  });

  it('muestra las gráficas de analíticas con los datos cargados', async () => {
    renderPage();

    expect(
      await screen.findByTestId('analytics-section', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('chart-sales-trend')).toBeInTheDocument();
    expect(screen.getByTestId('chart-orders-donut')).toBeInTheDocument();
  });

  it('filtra las métricas y analíticas al cambiar el rango de fechas', async () => {
    renderPage();

    await screen.findByTestId('merchant-metrics', undefined, { timeout: 5000 });

    const startInput = screen.getByLabelText('Fecha de inicio');
    fireEvent.change(startInput, { target: { value: '2026-08-01' } });
    await waitFor(() => {
      expect(startInput).toHaveValue('2026-08-01');
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Fecha de inicio')).not.toBeDisabled();
    });

    const endInput = screen.getByLabelText('Fecha de fin');
    fireEvent.change(endInput, { target: { value: '2026-08-15' } });
    await waitFor(() => {
      expect(serviceMocks.fetchMerchantMetrics).toHaveBeenCalledWith(
        'm-1',
        '2026-08-01',
        '2026-08-15',
      );
      expect(analyticsMocks.fetchMerchantAnalytics).toHaveBeenCalledWith(
        'm-1',
        '2026-08-01',
        '2026-08-15',
      );
    });
  });

  it('restablece el rango de fechas al hacer clic en "Restablecer"', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId('merchant-metrics', undefined, { timeout: 5000 });

    const startInput = screen.getByLabelText('Fecha de inicio') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '2026-08-01' } });
    await waitFor(() => {
      expect(startInput).toHaveValue('2026-08-01');
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Fecha de inicio')).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: /restablecer rango de fechas/i }));

    await waitFor(() => {
      const resetStartInput = screen.getByLabelText('Fecha de inicio') as HTMLInputElement;
      expect(resetStartInput.value).not.toBe('2026-08-01');
      expect(resetStartInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('muestra el selector de rango de fechas con las fechas por defecto', async () => {
    renderPage();

    await screen.findByTestId('merchant-metrics', undefined, { timeout: 5000 });

    const startInput = screen.getByLabelText('Fecha de inicio') as HTMLInputElement;
    const endInput = screen.getByLabelText('Fecha de fin') as HTMLInputElement;
    expect(startInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('lista los empleados con estado y badges de permisos', async () => {
    renderPage();

    const row = await screen.findByTestId('staff-row', undefined, { timeout: 5000 });
    expect(row).toHaveTextContent('Carlos Ruiz');
    expect(row).toHaveTextContent('carlos@pizzeria.com');
    expect(row).toHaveTextContent('Gestión de menú');
    expect(row).toHaveTextContent('Ver métricas');
  });

  it('muestra el error de carga de la lista de empleados', async () => {
    serviceMocks.listStaff.mockRejectedValue(
      new Error('Error al cargar los empleados: rls denied'),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error al cargar los empleados: rls denied',
    );
  });

  it('muestra el error de analíticas cuando fetchMerchantAnalytics falla', async () => {
    analyticsMocks.fetchMerchantAnalytics.mockRejectedValue(
      new Error('Error al obtener órdenes para análisis: conexión fallida'),
    );

    renderPage();

    await screen.findByTestId('merchant-metrics', undefined, { timeout: 5000 });
    expect(
      await screen.findByText(/Error al obtener órdenes para análisis/i),
    ).toBeInTheDocument();
  });

  describe('alta de empleados', () => {
    async function openModalAndFill(): Promise<void> {
      const user = userEvent.setup();
      renderPage();
      await user.click(
        await screen.findByTestId('open-add-employee', undefined, { timeout: 5000 }),
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
      expect(screen.getByTestId('permission-settings')).not.toBeChecked();
      expect(screen.getByTestId('permission-metrics')).not.toBeChecked();
    });

    it('crea al empleado vía el Edge Function y refresca el listado', async () => {
      const user = userEvent.setup();
      await openModalAndFill();

      await user.click(screen.getByTestId('permission-menu'));
      await user.click(screen.getByTestId('permission-settings'));
      await user.click(screen.getByTestId('confirm-add-employee'));

      await waitFor(() => {
        expect(serviceMocks.createEmployee).toHaveBeenCalledWith('m-1', {
          fullName: 'Ana Gómez',
          email: 'ana@pizzeria.com',
          password: 'Clave123',
          role: 'merchant_staff',
          permissions: {
            can_manage_orders: false,
            can_manage_menu: true,
            can_manage_settings: true,
            can_view_metrics: false,
          },
        });
      });
      await waitFor(() => {
        expect(serviceMocks.listStaff).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(
          screen.queryByRole('form', { name: /formulario de alta de empleado/i }),
        ).not.toBeInTheDocument();
      }, { timeout: 5000 });
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
        new Error('El correo electrónico ya está registrado como empleado activo en este negocio.'),
      );
      const user = userEvent.setup();
      await openModalAndFill();

      await user.click(screen.getByTestId('confirm-add-employee'));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'El correo electrónico ya está registrado como empleado activo en este negocio.',
      );
    });

    it('permite registrar un repartidor seleccionando el rol "driver"', async () => {
      const user = userEvent.setup();
      await openModalAndFill();

      await user.selectOptions(screen.getByTestId('employee-role'), 'driver');

      await user.click(screen.getByTestId('confirm-add-employee'));

      await waitFor(() => {
        expect(serviceMocks.createEmployee).toHaveBeenCalledWith('m-1', {
          fullName: 'Ana Gómez',
          email: 'ana@pizzeria.com',
          password: 'Clave123',
          role: 'driver',
          permissions: {
            can_manage_orders: true,
            can_manage_menu: false,
            can_manage_settings: false,
            can_view_metrics: false,
          },
        });
      });
    });
  });

  describe('gestión de empleados', () => {
    it('revoca el acceso del empleado', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('revoke-staff-s-1'));

      await waitFor(() => {
        expect(serviceMocks.setStaffActive).toHaveBeenCalledWith('s-1', false);
      });
      expect(await screen.findByText(/acceso revocado/i)).toBeInTheDocument();
    });

    it('abre el modal de confirmación antes de eliminar al empleado', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('delete-staff-s-1'));

      expect(
        await screen.findByText(/Confirmar eliminación/i),
      ).toBeInTheDocument();
      expect(screen.getByTestId('confirm-delete-employee')).toBeInTheDocument();
      expect(screen.queryByTestId('staff-row')).toBeInTheDocument();
    });

    it('elimina al empleado del listado después de confirmar en el modal', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('delete-staff-s-1'));
      await user.click(screen.getByTestId('confirm-delete-employee'));

      await waitFor(() => {
        expect(serviceMocks.deleteStaff).toHaveBeenCalledWith('s-1');
      });
      expect(screen.queryByTestId('staff-row')).not.toBeInTheDocument();
    });

    it('cancela la eliminación desde el modal sin llamar al servicio', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('delete-staff-s-1'));

      const cancelButtons = screen.getAllByRole('button', { name: /cancelar/i });
      await user.click(cancelButtons[0]);

      await waitFor(() => {
        expect(serviceMocks.deleteStaff).not.toHaveBeenCalled();
      });
      expect(screen.queryByTestId('confirm-delete-employee')).not.toBeInTheDocument();
    });

    it('abre el modal de modificación de permisos al hacer clic en "Permisos"', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('modify-staff-s-1'));

      expect(
        await screen.findByText(/Modificar permisos/i),
      ).toBeInTheDocument();
      expect(screen.getByTestId('save-permissions')).toBeInTheDocument();
    });

    it('guarda los permisos modificados del empleado', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('modify-staff-s-1'));

      const ordersCheckbox = await screen.findByTestId('update-permission-can_manage_orders');
      await user.click(ordersCheckbox);

      const settingsCheckbox = screen.getByTestId('update-permission-can_manage_settings');
      await user.click(settingsCheckbox);

      await user.click(screen.getByTestId('save-permissions'));

      await waitFor(() => {
        expect(serviceMocks.updateStaffPermissions).toHaveBeenCalledWith('s-1', {
          can_manage_menu: true,
          can_view_orders: true,
          can_manage_orders: true,
          can_manage_settings: true,
          can_view_metrics: true,
        });
      });
    });

    it('cierra el modal de modificación sin guardar al cancelar', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId('staff-row', undefined, { timeout: 5000 });

      await user.click(screen.getByTestId('modify-staff-s-1'));
      await screen.findByTestId('save-permissions');

      const cancelButtons = screen.getAllByRole('button', { name: /cancelar/i });
      await user.click(cancelButtons[0]);

      await waitFor(() => {
        expect(serviceMocks.updateStaffPermissions).not.toHaveBeenCalled();
      });
    });
  });

  it('oculta los controles de gestión de empleados para usuarios que no son owner', async () => {
    serviceMocks.getMerchantContext.mockResolvedValue({ ...context, isOwner: false });

    renderPage();

    expect(await screen.findByTestId('staff-list', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByTestId('open-add-employee')).not.toBeInTheDocument();
    expect(screen.queryByTestId('revoke-staff-s-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('modify-staff-s-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-staff-s-1')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay empleados', async () => {
    serviceMocks.listStaff.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(/aún no hay empleados/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it('oculta métricas y analíticas para merchant_staff pero mantiene la gestión de empleados', async () => {
    authMocks.useAuth.mockReturnValue({
      user: { id: 'staff-1' },
      profile: { role: 'merchant_staff' },
      isLoading: false,
    });
    serviceMocks.getMerchantContext.mockResolvedValue({ ...context, isOwner: false });

    renderPage();

    await screen.findByTestId('staff-list', undefined, { timeout: 5000 });

    expect(screen.queryByTestId('merchant-metrics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('analytics-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('open-add-employee')).not.toBeInTheDocument();
    expect(screen.queryByTestId('revoke-staff-s-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('modify-staff-s-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-staff-s-1')).not.toBeInTheDocument();
  });
});
