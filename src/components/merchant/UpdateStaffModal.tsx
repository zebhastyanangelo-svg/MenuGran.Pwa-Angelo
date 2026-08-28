import { UserRound } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PERMISSION_OPTIONS, permissionsToFormInput } from '../../utils/staffPermissions';
import type { StaffListItem } from '../../services/merchantStaffService';
import type { MerchantStaffPermissions } from '../../types/database';

export interface UpdateStaffModalProps {
  staff: StaffListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissions: MerchantStaffPermissions) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}

export function UpdateStaffModal({
  staff,
  isOpen,
  onClose,
  onSave,
  isSaving,
  error,
}: UpdateStaffModalProps) {
  if (staff === null) return null;

  const formInput = permissionsToFormInput(staff.permissions);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Modificar permisos: ${staff.fullName ?? staff.email ?? 'Empleado'}`}
    >
      <form
        className="space-y-4"
        aria-label="Formulario de modificación de permisos"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const nextPermissions: MerchantStaffPermissions = {
            can_manage_menu: formData.get('can_manage_menu') === 'true',
            can_view_orders: true,
            can_manage_orders: formData.get('can_manage_orders') === 'true',
            can_manage_settings: formData.get('can_manage_settings') === 'true',
            can_view_metrics: formData.get('can_view_metrics') === 'true',
          };
          await onSave(nextPermissions);
        }}
      >
        <fieldset className="space-y-2 rounded-xl border border-gray-200 p-3">
          <legend className="px-1 text-sm font-medium text-gray-700">
            Permisos de acceso
          </legend>
          {PERMISSION_OPTIONS.map((option) => {
            const checked = formInput[option.key] ?? false;
            return (
              <label
                key={option.key}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                  <input
                    type="checkbox"
                    name={option.key}
                    value="true"
                    data-testid={`update-permission-${option.key}`}
                    defaultChecked={checked}
                    disabled={isSaving}
                  />
                {option.label}
              </label>
            );
          })}
        </fieldset>

        {error !== null && (
          <p
            className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            data-testid="save-permissions"
          >
            <UserRound className="h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default UpdateStaffModal;
