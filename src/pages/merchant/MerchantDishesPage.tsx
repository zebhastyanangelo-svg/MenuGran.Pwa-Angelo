import { useAuth } from '../../hooks/useAuth';
import { useMerchantDashboard } from '../../hooks/useMerchantDashboard';
import { ProductManagement } from '../../components/merchant/ProductManagement';

export function MerchantDishesPage() {
  const { user } = useAuth();
  const { merchantIds, loading } = useMerchantDashboard(user);
  const merchantId = merchantIds[0] ?? '';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Gestión del Menú
          </h1>
          <p className="text-sm text-gray-500">
            Administra tus platillos, precios, imágenes y disponibilidad.
          </p>
        </header>

        {loading ? (
          <p className="text-gray-600 text-sm" role="status">
            Cargando comercio...
          </p>
        ) : merchantId ? (
          <ProductManagement merchantId={merchantId} />
        ) : (
          <p className="text-gray-600 text-sm" role="status">
            No tienes comercios asociados. Contacta al administrador.
          </p>
        )}
      </div>
    </div>
  );
}
