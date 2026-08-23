/**
 * Permisos granularizados y validación del alta de empleados (merchant_staff).
 * Las mismas reglas se aplican en el cliente (modal) y en el Edge Function.
 */
import type { MerchantStaffPermissions } from '../types/database';

export interface EmployeeFormInput {
  fullName: string;
  email: string;
  password: string;
  permissions: {
    can_manage_orders: boolean;
    can_manage_menu: boolean;
  };
}

export const MIN_EMPLOYEE_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Permisos por defecto: solo consulta de pedidos. */
export const DEFAULT_STAFF_PERMISSIONS: MerchantStaffPermissions = {
  can_manage_menu: false,
  can_view_orders: true,
};

/**
 * Normaliza los checkboxes del formulario al contrato JSONB de
 * `merchant_staff.permissions`. `can_manage_orders` implica `can_view_orders`.
 */
export function toStaffPermissions(
  input: EmployeeFormInput['permissions'],
): MerchantStaffPermissions {
  return {
    can_manage_menu: input.can_manage_menu,
    can_view_orders: true,
    can_manage_orders: input.can_manage_orders,
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
};
