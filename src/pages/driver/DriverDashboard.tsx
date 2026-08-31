import { useCallback, useState } from 'react';
import { Package, MapPin, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

export function DriverDashboard() {
  const { signOut } = useAuth();
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
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-800">
              Pedidos disponibles
            </h2>
          </div>
          <p className="text-sm text-gray-500" data-testid="driver-placeholder">
            Próximamente verás aquí los pedidos asignados para entrega.
          </p>
        </section>
      </main>
    </div>
  );
}

export default DriverDashboard;
