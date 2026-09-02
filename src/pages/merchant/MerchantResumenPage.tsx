import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  DollarSign,
  Loader2,
  Plus,
  Settings,
  Store,
  Users,
  UserCircle2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { MerchantStaffPermissions } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  createEmployee,
  deleteStaff,
  fetchMerchantMetrics,
  getMerchantContext,
  listStaff,
  setStaffActive,
  updateStaffPermissions,
  type MerchantContext,
  type MerchantMetrics,
  type StaffListItem,
} from '../../services/merchantStaffService';
import {
  fetchMerchantAnalytics,
  type MerchantAnalytics,
} from '../../services/merchantAnalyticsService';
import {
  PERMISSION_LABELS,
  validateEmployeeInput,
  type EmployeeFormInput,
  type EmployeeRole,
} from '../../utils/staffPermissions';
import {
  DateRangePicker,
  getDefaultDateRange,
} from '../../components/merchant/DateRangePicker';
import { SalesTrendChart } from '../../components/merchant/SalesTrendChart';
import { OrdersDonutChart } from '../../components/merchant/OrdersDonutChart';
import { UpdateStaffModal } from '../../components/merchant/UpdateStaffModal';
import { DeleteStaffConfirmModal } from '../../components/merchant/DeleteStaffConfirmModal';

const EMPTY_EMPLOYEE: EmployeeFormInput = {
  fullName: '',
  email: '',
  password: '',
  role: 'merchant_staff',
  permissions: {
    can_manage_orders: false,
    can_manage_menu: false,
    can_manage_settings: false,
    can_view_metrics: false,
  },
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`;
}

export function MerchantResumenPage() {
  const { user } = useAuth();
  const [context, setContext] = useState<MerchantContext | null>(null);
  const [metrics, setMetrics] = useState<MerchantMetrics | null>(null);
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null);
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => getDefaultDateRange());

  const refetchMetrics = useCallback(
    async (merchantId: string) => {
      const [staffList, metricsData] = await Promise.all([
        listStaff(merchantId),
        fetchMerchantMetrics(merchantId, dateRange.startDate, dateRange.endDate),
      ]);
      setStaff(staffList);
      setMetrics(metricsData);
    },
    [dateRange.startDate, dateRange.endDate],
  );

  const loadAnalytics = useCallback(
    async (merchantId: string) => {
      setIsAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const data = await fetchMerchantAnalytics(
          merchantId,
          dateRange.startDate,
          dateRange.endDate,
        );
        setAnalytics(data);
      } catch (caught) {
        setAnalyticsError(
          caught instanceof Error
            ? caught.message
            : 'No se pudieron cargar las analíticas.',
        );
      } finally {
        setIsAnalyticsLoading(false);
      }
    },
    [dateRange.startDate, dateRange.endDate],
  );

  useEffect(() => {
    if (user === null) return;
    let cancelled = false;
    setIsLoading(true);
    void (async () => {
      try {
        const merchantContext = await getMerchantContext(user.id);
        if (cancelled) return;
        setContext(merchantContext);
        if (merchantContext !== null) {
          await Promise.all([
            refetchMetrics(merchantContext.merchantId),
            loadAnalytics(merchantContext.merchantId),
          ]);
        }
        if (!cancelled) setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'No se pudo cargar el resumen del comercio.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refetchMetrics, loadAnalytics]);

  useEffect(() => {
    if (context === null) return;
    void (async () => {
      try {
        await Promise.all([
          refetchMetrics(context.merchantId),
          loadAnalytics(context.merchantId),
        ]);
      } catch (caught) {
        if (caught instanceof Error) {
          setError(caught.message);
        }
      }
    })();
  }, [context, refetchMetrics, loadAnalytics]);

  const handleDateChange = useCallback((start: string, end: string) => {
    setDateRange({ startDate: start, endDate: end });
  }, []);

  if (isLoading) {
    return (
      <div
        className="py-8 text-center text-gray-500 font-medium"
        role="status"
      >
        Cargando resumen del comercio...
      </div>
    );
  }

  if (error !== null && context === null) {
    return (
      <div
        className="p-4 bg-red-50 border border-red-200 rounded text-red-700"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (context === null) {
    return (
      <div
        className="py-8 text-center text-gray-500 font-medium"
        role="status"
      >
        No se encontró un comercio asociado a tu cuenta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error !== null && (
        <p
          className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {context.isOwner && (
        <section
          aria-label="Métricas del comercio"
          data-testid="merchant-metrics"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={handleDateChange}
              isLoading={isAnalyticsLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              testId="metric-total-sales"
              icon={<DollarSign className="h-5 w-5 text-green-600" />}
              label="Total de ventas"
              value={formatCurrency(metrics?.totalSales ?? 0)}
            />
            <MetricCard
              testId="metric-orders-today"
              icon={<ClipboardList className="h-5 w-5 text-indigo-600" />}
              label="Pedidos en rango"
              value={String(metrics?.ordersToday ?? 0)}
            />
            <MetricCard
              testId="metric-active-products"
              icon={<Store className="h-5 w-5 text-brand-red" />}
              label="Platos activos"
              value={String(metrics?.activeProducts ?? 0)}
            />
          </div>
        </section>
      )}

      {context.isOwner && (
        <section
          aria-label="Analíticas de ventas"
          data-testid="analytics-section"
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Analíticas de ventas
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div data-testid="chart-sales-trend">
              <SalesTrendChart
                data={analytics?.dailyRevenue ?? []}
                isLoading={isAnalyticsLoading}
                error={analyticsError}
              />
            </div>
            <div data-testid="chart-orders-donut">
              <OrdersDonutChart
                data={analytics?.statusBreakdown ?? []}
                isLoading={isAnalyticsLoading}
              />
            </div>
          </div>
        </section>
      )}

      <EmployeeManagementSection
        context={context}
        staff={staff}
        onStaffChanged={async () => {
          await refetchMetrics(context.merchantId);
        }}
        onError={setError}
      />
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}

function MetricCard({ icon, label, value, testId }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p
        className="mt-2 text-2xl font-bold text-gray-900"
        data-testid={testId}
      >
        {value}
      </p>
    </div>
  );
}

interface EmployeeManagementSectionProps {
  context: MerchantContext;
  staff: StaffListItem[];
  onStaffChanged: () => Promise<void>;
  onError: (message: string) => void;
}

function EmployeeManagementSection({
  context,
  staff,
  onStaffChanged,
  onError,
}: EmployeeManagementSectionProps) {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [employeeInput, setEmployeeInput] =
    useState<EmployeeFormInput>(EMPTY_EMPLOYEE);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [staffToUpdate, setStaffToUpdate] = useState<StaffListItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);
  const [localStaff, setLocalStaff] = useState<StaffListItem[]>(staff);

  useEffect(() => {
    setLocalStaff(staff);
  }, [staff]);

  const openAddModal = useCallback(() => {
    setEmployeeInput(EMPTY_EMPLOYEE);
    setFormError(null);
    setIsAddModalOpen(true);
  }, []);

  const openUpdateModal = useCallback((employee: StaffListItem) => {
    setStaffToUpdate(employee);
    setUpdateError(null);
    setIsUpdateModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((employee: StaffListItem) => {
    setStaffToDelete(employee);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  }, []);

  const handleCreateEmployee = useCallback(async () => {
    const validationError = validateEmployeeInput(employeeInput);
    if (validationError !== null) {
      setFormError(validationError);
      return;
    }
    setIsCreating(true);
    setFormError(null);
    try {
      await createEmployee(context.merchantId, employeeInput);
      await onStaffChanged();
      setIsAddModalOpen(false);
      setEmployeeInput(EMPTY_EMPLOYEE);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo crear al empleado.',
      );
    } finally {
      setIsCreating(false);
    }
  }, [context.merchantId, employeeInput, onStaffChanged]);

  const handleRevoke = useCallback(
    async (employee: StaffListItem) => {
      setBusyStaffId(employee.id);
      try {
        await setStaffActive(employee.id, !employee.isActive);
        setLocalStaff((previous) =>
          previous.map((item) =>
            item.id === employee.id
              ? { ...item, isActive: !item.isActive }
              : item,
          ),
        );
        await queryClient.invalidateQueries({ queryKey: ['staffPermissions'] });
      } catch (caught) {
        onError(
          caught instanceof Error
            ? caught.message
            : 'No se pudo actualizar el acceso.',
        );
      } finally {
        setBusyStaffId(null);
      }
    },
    [onError, queryClient],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (staffToDelete === null) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteStaff(staffToDelete.id);
      setLocalStaff((previous) =>
        previous.filter((item) => item.id !== staffToDelete.id),
      );
      await queryClient.invalidateQueries({ queryKey: ['staffPermissions'] });
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    } catch (caught) {
      setDeleteError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo eliminar al empleado.',
      );
    } finally {
      setIsDeleting(false);
    }
  }, [staffToDelete, queryClient]);

  const handleSavePermissions = useCallback(
    async (permissions: MerchantStaffPermissions) => {
      if (staffToUpdate === null) return;
      setIsSaving(true);
      setUpdateError(null);
      try {
        await updateStaffPermissions(staffToUpdate.id, permissions);
        setLocalStaff((previous) =>
          previous.map((item) =>
            item.id === staffToUpdate.id ? { ...item, permissions } : item,
          ),
        );
        await queryClient.invalidateQueries({ queryKey: ['staffPermissions'] });
        setIsUpdateModalOpen(false);
        setStaffToUpdate(null);
      } catch (caught) {
        setUpdateError(
          caught instanceof Error
            ? caught.message
            : 'No se pudo actualizar los permisos.',
        );
      } finally {
        setIsSaving(false);
      }
    },
    [staffToUpdate, queryClient],
  );

  const displayStaff = useMemo(() => localStaff, [localStaff]);

  return (
    <section aria-label="Gestión de empleados" data-testid="staff-section">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Gestión de Empleados
        </h2>
        {context.isOwner && (
          <Button
            onClick={openAddModal}
            size="sm"
            data-testid="open-add-employee"
          >
            <Plus className="h-4 w-4" />
            Agregar Empleado
          </Button>
        )}
      </div>

      {displayStaff.length === 0 ? (
        <p className="text-sm text-gray-600" role="status">
          Aún no hay empleados vinculados a este negocio.
        </p>
      ) : (
        <ul
          className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white"
          data-testid="staff-list"
        >
          {displayStaff.map((employee) => (
            <li
              key={employee.id}
              data-testid="staff-row"
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {employee.fullName ?? 'Sin nombre'}
                  {!employee.isActive && (
                    <span className="ml-2 text-xs text-red-500">
                      (acceso revocado)
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {employee.email ?? 'sin email'}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(
                    Object.keys(PERMISSION_LABELS) as Array<keyof MerchantStaffPermissions>
                  )
                    .filter((key) => employee.permissions?.[key] === true)
                    .map((key) => (
                      <Badge key={key} variant="neutral">
                        {PERMISSION_LABELS[key]}
                      </Badge>
                    ))}
                </div>
              </div>
              {context.isOwner && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`modify-staff-${employee.id}`}
                    onClick={() => openUpdateModal(employee)}
                  >
                    <Settings className="h-4 w-4" />
                    Permisos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyStaffId === employee.id}
                    onClick={() => void handleRevoke(employee)}
                    data-testid={`revoke-staff-${employee.id}`}
                  >
                    {busyStaffId === employee.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : employee.isActive ? (
                      'Revocar acceso'
                    ) : (
                      'Restaurar acceso'
                    )}
                  </Button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${employee.fullName ?? employee.email}`}
                    title={`Eliminar ${employee.fullName ?? employee.email}`}
                    disabled={busyStaffId === employee.id}
                    onClick={() => openDeleteModal(employee)}
                    data-testid={`delete-staff-${employee.id}`}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-50"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Agregar Empleado"
      >
        <form
          className="space-y-4"
          aria-label="Formulario de alta de empleado"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateEmployee();
          }}
        >
          <Input
            label="Nombre completo"
            name="employeeFullName"
            autoComplete="name"
            value={employeeInput.fullName}
            onChange={(event) =>
              setEmployeeInput((prev) => ({
                ...prev,
                fullName: event.target.value,
              }))
            }
          />
          <Input
            label="Correo electrónico"
            name="employeeEmail"
            type="email"
            autoComplete="email"
            helperText="El empleado iniciará sesión con este correo."
            value={employeeInput.email}
            onChange={(event) =>
              setEmployeeInput((prev) => ({ ...prev, email: event.target.value }))
            }
          />
          <Input
            label="Contraseña inicial"
            name="employeePassword"
            type="password"
            autoComplete="new-password"
            value={employeeInput.password}
            onChange={(event) =>
              setEmployeeInput((prev) => ({
                ...prev,
                password: event.target.value,
              }))
            }
          />

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Rol</span>
            <select
              name="employeeRole"
              value={employeeInput.role}
              onChange={(event) => {
                const newRole = event.target.value as EmployeeRole;
                setEmployeeInput((prev) => ({
                  ...prev,
                  role: newRole,
                  permissions:
                    newRole === 'driver'
                      ? {
                          can_manage_orders: true,
                          can_manage_menu: false,
                          can_manage_settings: false,
                          can_view_metrics: false,
                        }
                      : prev.permissions,
                }));
              }}
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="employee-role"
            >
              <option value="merchant_staff">Empleado de Staff</option>
              <option value="driver">Repartidor</option>
            </select>
          </label>

          <fieldset className="space-y-2 rounded-xl border border-gray-200 p-3">
            <legend className="px-1 text-sm font-medium text-gray-700">
              Permisos de acceso
            </legend>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="permission-orders"
                checked={employeeInput.permissions.can_manage_orders}
                onChange={(event) =>
                  setEmployeeInput((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      can_manage_orders: event.target.checked,
                    },
                  }))
                }
              />
              {PERMISSION_LABELS.can_manage_orders}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="permission-menu"
                checked={employeeInput.permissions.can_manage_menu}
                onChange={(event) =>
                  setEmployeeInput((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      can_manage_menu: event.target.checked,
                    },
                  }))
                }
              />
              {PERMISSION_LABELS.can_manage_menu}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="permission-settings"
                checked={employeeInput.permissions.can_manage_settings}
                onChange={(event) =>
                  setEmployeeInput((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      can_manage_settings: event.target.checked,
                    },
                  }))
                }
              />
              {PERMISSION_LABELS.can_manage_settings}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="permission-metrics"
                checked={employeeInput.permissions.can_view_metrics}
                onChange={(event) =>
                  setEmployeeInput((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      can_view_metrics: event.target.checked,
                    },
                  }))
                }
              />
              {PERMISSION_LABELS.can_view_metrics}
            </label>
          </fieldset>

          {formError !== null && (
            <p
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
              role="alert"
            >
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={isCreating}
              data-testid="confirm-add-employee"
            >
              <UserCircle2 className="h-4 w-4" />
              Crear empleado
            </Button>
          </div>
        </form>
      </Modal>

      <UpdateStaffModal
        staff={staffToUpdate}
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setStaffToUpdate(null);
        }}
        onSave={handleSavePermissions}
        isSaving={isSaving}
        error={updateError}
      />

      {staffToDelete !== null && (
        <DeleteStaffConfirmModal
          staffName={staffToDelete.fullName ?? staffToDelete.email}
          staffEmail={staffToDelete.email}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setStaffToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </section>
  );
}

export default MerchantResumenPage;
