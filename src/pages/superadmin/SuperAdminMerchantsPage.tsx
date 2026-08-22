import { useCallback } from 'react';
import { ShieldCheck, Store } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CreateMerchantForm } from '../../components/superadmin/CreateMerchantForm';
import { useSuperAdminMerchants } from '../../hooks/useSuperAdminMerchants';
import type { CreateMerchantAccountInput } from '../../utils/merchantRegistration';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending_approval: 'Pendiente',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
};

/** Panel de Super Admin: creación y listado de comercios. */
export function SuperAdminMerchantsPage() {
  const {
    merchants,
    isLoading,
    error,
    lastCreatedPassword,
    addMerchant,
  } = useSuperAdminMerchants();

  const handleCreate = useCallback(
    async (input: CreateMerchantAccountInput) => {
      await addMerchant(input);
    },
    [addMerchant],
  );

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
                  <Badge variant={merchant.is_active ? 'success' : 'neutral'}>
                    {STATUS_LABELS[merchant.status] ?? merchant.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default SuperAdminMerchantsPage;
