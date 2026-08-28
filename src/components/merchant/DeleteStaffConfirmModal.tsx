import { Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface DeleteStaffConfirmModalProps {
  staffName: string | null;
  staffEmail: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  error: string | null;
}

export function DeleteStaffConfirmModal({
  staffName,
  staffEmail,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  error,
}: DeleteStaffConfirmModalProps) {
  const displayName = staffName ?? staffEmail ?? 'este empleado';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar eliminación"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            isLoading={isDeleting}
            disabled={isDeleting}
            data-testid="confirm-delete-employee"
            onClick={() => {
              void onConfirm();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          ¿Estás seguro de que deseas eliminar a{' '}
          <strong className="font-semibold">{displayName}</strong> del
          comercio?
        </p>
        <p className="text-xs text-gray-500">
          Esta acción no se puede deshacer. El empleado perderá el acceso al
          panel de este negocio.
        </p>

        {error !== null && (
          <p
            className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export default DeleteStaffConfirmModal;
