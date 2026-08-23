import { useCallback, useState } from 'react';
import { Loader2, ShieldCheck, Store, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { CreateMerchantForm } from '../../components/superadmin/CreateMerchantForm';
import { useSuperAdminMerchants } from '../../hooks/useSuperAdminMerchants';
import type { MerchantAccountListItem } from '../../services/superAdminService';
import type { CreateMerchantAccountInput } from '../../utils/merchantRegistration';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending_approval: 'Pendiente',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
};

/** Panel de Super Admin: creación, listado y eliminación de comercios. */
export function SuperAdminMerchantsPage() {
  const {
    merchants,
    isLoading,
    error,
    lastCreatedPassword,
    addMerchant,
    removeMerchant,
  } = useSuperAdminMerchants();
  const [merchantPendingDelete, setMerchantPendingDelete] =
    useState<MerchantAccountListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (input: CreateMerchantAccountInput) => {
      await addMerchant(input);
    },
    [addMerchant],
  );

  const closeDeleteModal = useCallback(() => {
    setMerchantPendingDelete(null);
    setDeleteError(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (merchantPendingDelete === null) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await removeMerchant(merchantPendingDelete);
      closeDeleteModal();
    } catch (caught) {
      setDeleteError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo eliminar el comercio.',
      );
    } finally {
      setIsDeleting(false);
    }
  }, [merchantPendingDelete, removeMerchant, closeDeleteModal]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10">
            <ShieldCheck className="h-5 w-5 text-brand-red" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Panel de Super Admin
            </h1>
            <p className="text-sm text-gray-500">
              Crea y gestiona los negocios de la plataforma.
            </p>
          </div>
        </header>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Store className="h-5 w-5 text-brand-red" />
            Crear nuevo negocio
          </h2>
          <CreateMerchantForm onSubmit={handleCreate} />
          {lastCreatedPassword !== null && (
            <p
              className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700"
              role="status"
              data-testid="creation-success"
            >
              Comercio creado. Contraseña temporal:{' '}
              <code className="font-mono font-semibold">
                {lastCreatedPassword}
              </code>
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Negocios registrados
          </h2>
          {error !== null && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {isLoading ? (
            <p className="text-sm text-gray-600" role="status">
              Cargando comercios...
            </p>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-gray-600" role="status">
              Aún no hay negocios registrados.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100" aria-label="Listado de comercios">
              {merchants.map((merchant) => (
                <li
                  key={merchant.id}
                  data-testid="merchant-row"
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{merchant.name}</p>
                    <p className="text-sm text-gray-500">
                      RIF {merchant.rif} ·{' '}
                      {merchant.owner_email ?? 'sin email'} ·{' '}
                      {merchant.owner_full_name ?? 'sin propietario'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={merchant.is_active ? 'success' : 'neutral'}>
                      {STATUS_LABELS[merchant.status] ?? merchant.status}
                    </Badge>
                    <button
                      type="button"
                      data-testid="delete-merchant"
                      aria-label={`Eliminar ${merchant.name}`}
                      title={`Eliminar ${merchant.name}`}
                      onClick={() => {
                        setDeleteError(null);
                        setMerchantPendingDelete(merchant);
                      }}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        isOpen={merchantPendingDelete !== null}
        onClose={closeDeleteModal}
        title="Eliminar negocio"
      >
        {merchantPendingDelete !== null && (
          <div className="space-y-4">
            <p
              className="text-sm text-gray-700"
              data-testid="delete-confirmation-message"
            >
              ¿Estás seguro de que deseas eliminar{' '}
              <strong>{merchantPendingDelete.name}</strong>? Esta acción borrará
              el comercio y la cuenta del propietario permanentemente.
            </p>
            {deleteError !== null && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeDeleteModal} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button
                data-testid="confirm-delete"
                variant="danger"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminando...
                  </span>
                ) : (
                  'Eliminar permanentemente'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SuperAdminMerchantsPage;
