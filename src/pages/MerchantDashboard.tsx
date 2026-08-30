import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  useMerchantDashboard,
  PAYMENT_PROOF_BUCKET,
} from '../hooks/useMerchantDashboard';
import { supabase } from '../services/supabase';
import type { OrderWithCustomer } from '../hooks/useMerchantDashboardPage';
import { ProductManagement } from '../components/merchant/ProductManagement';
import { MerchantProfileForm } from '../components/merchant/MerchantProfileForm';
import { OrdersBoard } from '../components/merchant/OrdersBoard';
import { PaymentProofModal } from '../components/merchant/PaymentProofModal';

export function MerchantDashboard() {
  const { user } = useAuth();
  const { merchantIds, orders, loading, error, updateOrderStatus } =
    useMerchantDashboard(user);
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'profile'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  async function handleOpenProof(order: OrderWithCustomer) {
    setProofError(null);
    setProofUrl(null);
    setSelectedOrder(order);
    if (!order.payment_proof_url) return;
    try {
      const { data, error: signedError } = await supabase.storage
        .from(PAYMENT_PROOF_BUCKET)
        .createSignedUrl(order.payment_proof_url, 60);
      if (signedError || !data?.signedUrl) {
        setProofError(
          signedError?.message ?? 'No se pudo cargar el comprobante'
        );
        return;
      }
      setProofUrl(data.signedUrl);
    } catch (err: unknown) {
      setProofError(err instanceof Error ? err.message : 'Error de comprobante');
    }
  }

  function handleCloseProof() {
    setSelectedOrder(null);
    setProofUrl(null);
    setProofError(null);
  }

  const tabClass = (
    tab: 'orders' | 'catalog' | 'profile',
  ) =>
    `flex-1 sm:flex-none px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Panel de Comerciante
          </h1>
          <p className="text-sm text-gray-500">
            Gestiona tu catálogo y los pedidos entrantes en tiempo real.
          </p>
        </header>

        {loading && (
          <p className="text-gray-600 text-sm" role="status">
            Cargando pedidos...
          </p>
        )}
        {error && (
          <p className="text-red-600 text-sm" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && (
          <>
            {merchantIds.length === 0 && (
              <p className="text-gray-600 text-sm" role="status">
                No tienes comercios asociados. Contacta al administrador.
              </p>
            )}

            <nav
              className="flex gap-2 bg-white p-1 rounded-lg shadow-sm"
              aria-label="Secciones del panel"
            >
              <button
                type="button"
                className={tabClass('orders')}
                onClick={() => setActiveTab('orders')}
                aria-pressed={activeTab === 'orders'}
              >
                Pedidos
              </button>
              <button
                type="button"
                className={tabClass('catalog')}
                onClick={() => setActiveTab('catalog')}
                aria-pressed={activeTab === 'catalog'}
              >
                Catálogo
              </button>
              <button
                type="button"
                className={tabClass('profile')}
                onClick={() => setActiveTab('profile')}
                aria-pressed={activeTab === 'profile'}
              >
                Perfil
              </button>
            </nav>

             {activeTab === 'orders' ? (
               <OrdersBoard
                 orders={orders}
                 onUpdateStatus={updateOrderStatus}
                 onOpenProof={handleOpenProof}
               />
             ) : activeTab === 'catalog' ? (
               <ProductManagement merchantId={merchantIds[0] ?? ''} />
             ) : (
               <MerchantProfileForm merchantId={merchantIds[0] ?? ''} />
             )}
          </>
        )}
      </div>

      <PaymentProofModal
        order={selectedOrder}
        proofUrl={proofUrl}
        error={proofError}
        onClose={handleCloseProof}
      />
    </div>
  );
}
