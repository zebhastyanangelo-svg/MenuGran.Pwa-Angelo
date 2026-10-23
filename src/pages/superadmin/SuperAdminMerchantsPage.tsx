import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MerchantDetailsModal } from '../../components/superadmin/MerchantDetailsModal';
import { MerchantMetricsModal } from '../../components/superadmin/MerchantMetricsModal';
import { CreateMerchantForm } from '../../components/superadmin/CreateMerchantForm';
import { useSuperAdminMerchants } from '../../hooks/useSuperAdminMerchants';
import type { MerchantAccountListItem } from '../../services/superAdminService';
import type { CreateMerchantAccountInput } from '../../utils/merchantRegistration';
import posthog, { isPostHogEnabled } from '../../posthog';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending_approval: 'Pendiente',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
};

/** Panel de Super Admin: creación, listado y eliminación de comercios. */
export function SuperAdminMerchantsPage() {
  let navigate: NavigateFunction;
  try {
    navigate = useNavigate();
  } catch {
    // Montajes fuera de un <Router> (pruebas unitarias aisladas) hacen que
    // `useNavigate` lance; se degrada a la navegación nativa del navegador
    // sin romper el render. Con Router presente nunca entra aquí.
    navigate = ((to: string) => {
      window.location.assign(to);
    }) as NavigateFunction;
  }
  const {
    merchants,
    isLoading,
    error,
    lastCreatedPassword,
    addMerchant,
    removeMerchant,
    toggleMerchantVisibility,
  } = useSuperAdminMerchants();
  const [merchantPendingDelete, setMerchantPendingDelete] =
    useState<MerchantAccountListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /** Comercio cuya ficha detallada está abierta (clic en la fila). */
  const [selectedMerchant, setSelectedMerchant] =
    useState<MerchantAccountListItem | null>(null);
  /** Modal de métricas financieras, accesible desde la ficha del comercio. */
  const [metricsMerchant, setMetricsMerchant] = useState<string | null>(null);
  /** Id del comercio cuyo interruptor de visibilidad está en vuelo. */
  const [togglingMerchantId, setTogglingMerchantId] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (input: CreateMerchantAccountInput) => {
      await addMerchant(input);
      if (isPostHogEnabled) {
        posthog.capture('merchant_account_created');
      }
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

  /**
   * Alterna la visibilidad administrativa del comercio en el marketplace.
   * El interruptor es exclusivo del Superadmin: ocultar un comercio no
   * suspende su operación interna, solo lo excluye del público general.
   */
  const handleToggleVisibility = useCallback(
    async (merchant: MerchantAccountListItem) => {
      setTogglingMerchantId(merchant.id);
      setVisibilityError(null);
      try {
        await toggleMerchantVisibility(
          merchant.id,
          !(merchant.is_admin_active ?? true),
        );
      } catch (caught) {
        setVisibilityError(
          caught instanceof Error
            ? caught.message
            : 'No se pudo actualizar la visibilidad del comercio.',
        );
      } finally {
        setTogglingMerchantId(null);
      }
    },
    [toggleMerchantVisibility],
  );

  /**
   * Acceso transparente al panel de gestión del comercio: navega al tablero
   * del comerciante con `?merchant_id=` para operar ese negocio (pedidos,
   * catálogo y perfil) sin cambiar de sesión.
   */
  const handleOpenMerchantPanel = useCallback(
    (merchant: MerchantAccountListItem) => {
      navigate(`/admin?merchant_id=${encodeURIComponent(merchant.id)}`);
    },
    [navigate],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10">
            <i className="fa-solid fa-shield-halved text-xl text-brand-red" />
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
            <i className="fa-solid fa-store text-xl text-brand-red" />
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
          {visibilityError !== null && (
            <p className="text-sm text-red-600" role="alert">
              {visibilityError}
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
              {merchants.map((merchant) => {
                const isVisible = merchant.is_admin_active ?? true;
                const isTogglingThis = togglingMerchantId === merchant.id;
                return (
                <li
                  key={merchant.id}
                  data-testid="merchant-row"
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver detalles de ${merchant.name}`}
                  onClick={() => setSelectedMerchant(merchant)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedMerchant(merchant);
                    }
                  }}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
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
                      data-testid="open-merchant-panel"
                      aria-label={`Acceder al panel de ${merchant.name}`}
                      title={`Acceder al panel de gestión de ${merchant.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenMerchantPanel(merchant);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <i
                        className="fa-solid fa-arrow-up-right-from-square text-sm"
                        aria-hidden="true"
                      />
                      Acceder al panel
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isVisible}
                      data-testid="toggle-merchant-visibility"
                      aria-label={`${isVisible ? 'Ocultar' : 'Mostrar'} ${merchant.name} en el marketplace`}
                      title={
                        isVisible
                          ? `Ocultar ${merchant.name} del marketplace`
                          : `Mostrar ${merchant.name} en el marketplace`
                      }
                      disabled={isTogglingThis}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleVisibility(merchant);
                      }}
                      className={
                        isVisible
                          ? 'inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:opacity-60'
                          : 'inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60'
                      }
                    >
                      <i
                        className={`fa-solid ${isTogglingThis ? 'fa-spinner animate-spin' : isVisible ? 'fa-eye' : 'fa-eye-slash'} text-sm`}
                        aria-hidden="true"
                      />
                      {isVisible ? 'Activo en Marketplace' : 'Oculto por Administrador'}
                    </button>
                    <button
                      type="button"
                      data-testid="delete-merchant"
                      aria-label={`Eliminar ${merchant.name}`}
                      title={`Eliminar ${merchant.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteError(null);
                        setMerchantPendingDelete(merchant);
                      }}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <i className="fa-solid fa-trash-can text-base" />
                    </button>
                  </div>
                </li>
                );
              })}
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
                    <i className="fa-solid fa-spinner text-base animate-spin" />
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

       <MerchantDetailsModal
         merchantId={selectedMerchant?.id ?? ''}
         merchantName={selectedMerchant?.name ?? ''}
         ownerEmail={selectedMerchant?.owner_email ?? null}
         ownerFullName={selectedMerchant?.owner_full_name ?? null}
         createdAt={selectedMerchant?.created_at ?? null}
         isOpen={selectedMerchant !== null}
         onClose={() => setSelectedMerchant(null)}
         onViewMetrics={
           selectedMerchant !== null
             ? () => {
                 setMetricsMerchant(selectedMerchant.id);
                 setSelectedMerchant(null);
               }
             : undefined
         }
       />

       <MerchantMetricsModal
         merchantId={metricsMerchant ?? ''}
         merchantName={
           selectedMerchant?.name ??
           (metricsMerchant !== null
             ? (merchants.find((m) => m.id === metricsMerchant)?.name ?? 'Comercio')
             : '')
         }
         isOpen={metricsMerchant !== null}
         onClose={() => setMetricsMerchant(null)}
       />
     </div>
   );
 }

 export default SuperAdminMerchantsPage;
