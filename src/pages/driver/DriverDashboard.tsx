import { useCallback, useState } from 'react';
import { Package, LogOut, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDriverDashboard } from '../../hooks/useDriverDashboard';
import { DriverOrderCard } from '../../components/driver/DriverOrderCard';
import { Button } from '../../components/ui/Button';

export function DriverDashboard() {
  const { user, signOut } = useAuth();
  const {
    merchantName,
    orders,
    loading,
    error,
    actionLoading,
    actionError,
    takeOrder,
     markDelivered,
   } = useDriverDashboard(user);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  }, [signOut]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">Panel de Reparto</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            data-testid="driver-logout"
          >
            {isLoggingOut ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-1 h-4 w-4" />
            )}
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {merchantName && (
          <p className="mb-4 text-sm text-gray-600" data-testid="driver-merchant-name">
            Comercio: {merchantName}
          </p>
        )}

        {loading && (
          <p
            className="text-gray-600"
            role="status"
            data-testid="driver-loading"
          >
            Cargando pedidos...
          </p>
        )}

        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
            data-testid="driver-error"
          >
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}

        {actionError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
            data-testid="driver-action-error"
          >
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {actionError}
          </div>
        )}

        {!loading && !error && (
          <>
            {orders.length === 0 ? (
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <h2 className="text-base font-semibold text-gray-800">
                    Pedidos disponibles
                  </h2>
                </div>
                <p
                  className="text-sm text-gray-500"
                  data-testid="driver-no-orders"
                >
                  No hay pedidos disponibles en este momento.
                </p>
              </section>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <DriverOrderCard
                    key={order.id}
                    order={order}
                    onTakeOrder={takeOrder}
                    onMarkDelivered={markDelivered}
                    actionDisabled={actionLoading}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default DriverDashboard;
