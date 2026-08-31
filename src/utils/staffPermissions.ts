/**
 * Permisos granularizados y validación del alta de empleados (merchant_staff).
 * Las mismas reglas se aplican en el cliente (modal) y en el Edge Function.
 */
import type { MerchantStaffPermissions } from '../types/database';

export type EmployeeRole = 'merchant_staff' | 'driver';

export interface EmployeeFormInput {
  fullName: string;
  email: string;
  password: string;
  role: EmployeeRole;
  permissions: {
    can_manage_orders: boolean;
    can_manage_menu: boolean;
    can_manage_settings: boolean;
    can_view_metrics: boolean;
  };
}

export const MIN_EMPLOYEE_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Permisos por defecto: solo consulta de pedidos y métricas. */
export const DEFAULT_STAFF_PERMISSIONS: MerchantStaffPermissions = {
  can_manage_menu: false,
  can_view_orders: true,
  can_manage_settings: false,
  can_view_metrics: false,
};

/** Permisos de repartidor: solo gestión de pedidos. */
export const DRIVER_PERMISSIONS: MerchantStaffPermissions = {
  can_manage_menu: false,
  can_view_orders: true,
  can_manage_orders: true,
  can_manage_settings: false,
  can_view_metrics: false,
};

export interface PermissionOption {
  key: keyof EmployeeFormInput['permissions'];
  label: string;
}

/** Opciones de permisos para renderizar checkboxes en los modales. */
export const PERMISSION_OPTIONS: PermissionOption[] = [
  { key: 'can_manage_orders', label: 'Gestión de pedidos' },
  { key: 'can_manage_menu', label: 'Gestión de menú' },
  { key: 'can_manage_settings', label: 'Configuración' },
  { key: 'can_view_metrics', label: 'Ver métricas' },
];

export function toStaffPermissions(
  input: EmployeeFormInput['permissions'],
): MerchantStaffPermissions {
  return {
    can_manage_menu: input.can_manage_menu,
    can_view_orders: true,
    can_manage_orders: input.can_manage_orders,
    can_manage_settings: input.can_manage_settings,
    can_view_metrics: input.can_view_metrics,
  };
}

export function permissionsToFormInput(
  permissions: MerchantStaffPermissions,
): EmployeeFormInput['permissions'] {
  return {
    can_manage_orders: permissions.can_manage_orders ?? false,
    can_manage_menu: permissions.can_manage_menu,
    can_manage_settings: permissions.can_manage_settings ?? false,
    can_view_metrics: permissions.can_view_metrics ?? false,
  };
}

/**
 * Valida el formulario de creación de empleado.
 * Devuelve `null` si todo es válido; en caso contrario el mensaje de error.
 * (Las mismas reglas vive en supabase/functions/create-employee.)
 */
export function validateEmployeeInput(input: EmployeeFormInput): string | null {
  if (input.fullName.trim() === '') {
    return 'El nombre completo es obligatorio.';
  }
  if (!EMAIL_PATTERN.test(input.email.trim())) {
    return 'Ingresa un email válido para el empleado.';
  }
  if (input.password.length < MIN_EMPLOYEE_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_EMPLOYEE_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

/** Etiquetas legibles para los badges de permisos. */
export const PERMISSION_LABELS: Record<string, string> = {
  can_manage_orders: 'Gestión de pedidos',
  can_view_orders: 'Ver pedidos',
  can_manage_menu: 'Gestión de menú',
  can_manage_settings: 'Configuración',
  can_view_metrics: 'Ver métricas',
};
