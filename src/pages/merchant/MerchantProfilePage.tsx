import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  DollarSign,
  Loader2,
  Plus,
  Store,
  Trash2,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { MerchantStaffPermissions } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  createEmployee,
  deleteStaff,
  fetchMerchantMetrics,
  getMerchantContext,
  listStaff,
  setStaffActive,
  type MerchantContext,
  type MerchantMetrics,
  type StaffListItem,
} from '../../services/merchantStaffService';
import {
  PERMISSION_LABELS,
  validateEmployeeInput,
  type EmployeeFormInput,
} from '../../utils/staffPermissions';

const EMPTY_EMPLOYEE: EmployeeFormInput = {
  fullName: '',
  email: '',
  password: '',
  permissions: { can_manage_orders: false, can_manage_menu: false },
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`;
}

/** Vista Perfil del panel del comercio: métricas y gestión de empleados. */
export function MerchantProfilePage() {
  const { user } = useAuth();
  const [context, setContext] = useState<MerchantContext | null>(null);
  const [metrics, setMetrics] = useState<MerchantMetrics | null>(null);
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [employeeInput, setEmployeeInput] =
    useState<EmployeeFormInput>(EMPTY_EMPLOYEE);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);

  const refresh = useCallback(async (merchantId: string) => {
    const [staffList, metricsData] = await Promise.all([
      listStaff(merchantId),
      fetchMerchantMetrics(merchantId),
    ]);
    setStaff(staffList);
    setMetrics(metricsData);
  }, []);

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
          await refresh(merchantContext.merchantId);
        }
        if (!cancelled) setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'No se pudo cargar el perfil del comercio.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  const openAddModal = useCallback(() => {
    setEmployeeInput(EMPTY_EMPLOYEE);
    setFormError(null);
    setIsAddModalOpen(true);
  }, []);

  const handleCreateEmployee = useCallback(async () => {
    if (context === null) return;
    const validationError = validateEmployeeInput(employeeInput);
    if (validationError !== null) {
      setFormError(validationError);
      return;
    }
    setIsCreating(true);
    setFormError(null);
    try {
      await createEmployee(context.merchantId, employeeInput);
      await refresh(context.merchantId);
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
  }, [context, employeeInput, refresh]);

  const handleRevoke = useCallback(async (employee: StaffListItem) => {
    setBusyStaffId(employee.id);
    try {
      await setStaffActive(employee.id, !employee.isActive);
      setStaff((previous) =>
        previous.map((item) =>
          item.id === employee.id ? { ...item, isActive: !item.isActive } : item,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo actualizar el acceso.',
      );
    } finally {
      setBusyStaffId(null);
    }
  }, []);

  const handleDelete = useCallback(async (employee: StaffListItem) => {
    setBusyStaffId(employee.id);
    try {
      await deleteStaff(employee.id);
      setStaff((previous) =>
        previous.filter((item) => item.id !== employee.id),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo eliminar al empleado.',
      );
    } finally {
      setBusyStaffId(null);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-500 font-medium" role="status">
        Cargando perfil del comercio...
      </div>
    );
  }

  if (error !== null && context === null) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700" role="alert">
        {error}
      </div>
    );
  }

  if (context === null) {
    return (
      <div className="py-8 text-center text-gray-500 font-medium" role="status">
        No se encontró un comercio asociado a tu cuenta.
      </div>
    );
  }

  const permissionBadge = (key: string) => PERMISSION_LABELS[key];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10">
          <Store className="h-5 w-5 text-brand-red" />
        </span>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Perfil del Comercio
          </h1>
          <p className="text-sm text-gray-500">{context.merchantName}</p>
        </div>
      </header>

      {error !== null && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <section aria-label="Métricas del comercio" data-testid="merchant-metrics">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Resumen</h2>
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
            label="Pedidos del día"
            value={String(metrics?.ordersToday ?? 0)}
          />
          <MetricCard
            testId="metric-active-products"
            icon={<UtensilsCrossed className="h-5 w-5 text-brand-red" />}
            label="Platos activos"
            value={String(metrics?.activeProducts ?? 0)}
          />
        </div>
      </section>

      <section aria-label="Gestión de empleados" data-testid="staff-section">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Gestión de Empleados
          </h2>
          {context.isOwner && (
            <Button onClick={openAddModal} size="sm" data-testid="open-add-employee">
              <Plus className="h-4 w-4" />
              Agregar Empleado
            </Button>
          )}
        </div>

        {staff.length === 0 ? (
          <p className="text-sm text-gray-600" role="status">
            Aún no hay empleados vinculados a este negocio.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white" data-testid="staff-list">
            {staff.map((employee) => (
              <li key={employee.id} data-testid="staff-row" className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {employee.fullName ?? 'Sin nombre'}
                    {!employee.isActive && (
                      <span className="ml-2 text-xs text-red-500">(acceso revocado)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{employee.email ?? 'sin email'}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(Object.keys(PERMISSION_LABELS) as Array<keyof MerchantStaffPermissions>)
                      .filter((key) => employee.permissions?.[key] === true)
                      .map((key) => (
                        <Badge key={key} variant="neutral">
                          {permissionBadge(key)}
                        </Badge>
                      ))}
                  </div>
                </div>
                {context.isOwner && (
                  <div className="flex items-center gap-2">
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
                      onClick={() => void handleDelete(employee)}
                      data-testid={`delete-staff-${employee.id}`}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

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
          </fieldset>

          {formError !== null && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
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
            <Button type="submit" isLoading={isCreating} data-testid="confirm-add-employee">
              <UserRound className="h-4 w-4" />
              Crear empleado
            </Button>
          </div>
        </form>
      </Modal>
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
      <p className="mt-2 text-2xl font-bold text-gray-900" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

export default MerchantProfilePage;
