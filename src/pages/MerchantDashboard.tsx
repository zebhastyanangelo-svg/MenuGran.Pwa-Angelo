import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { OrderRow, OrderStatus } from '../types/database';
import { formatPrice } from '../types/cart';
import { ProductManagement } from '../components/merchant/ProductManagement';

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

export function MerchantDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog'>('orders');
  const [merchantIds, setMerchantIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [signedProofUrl, setSignedProofUrl] = useState<string | null>(null);

  // Determine which merchant IDs the user is associated with (owner or staff)
  const getUserMerchantIds = useCallback(async (): Promise<string[]> => {
    if (!user) return [];
    const merchantIds: string[] = [];

    // 1. Owner: merchant where owner_id = user.id
    const { data: ownerMerchants, error: ownerError } = await supabase
      .from(TABLE_NAMES.merchants)
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_active', true);

    if (!ownerError && Array.isArray(ownerMerchants)) {
      ownerMerchants.forEach((m) => {
        if (m?.id) merchantIds.push(m.id);
      });
    }

    // 2. Staff: merchant_staff where user_id = user.id and is_active = true
    const { data: staffLinks, error: staffError } = await supabase
      .from(TABLE_NAMES.merchantStaff)
      .select('merchant_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!staffError && Array.isArray(staffLinks)) {
      staffLinks.forEach((link) => {
        if (link?.merchant_id) merchantIds.push(link.merchant_id);
      });
    }

    return [...new Set(merchantIds)]; // deduplicate
  }, [user]);

  // Fetch orders for the user's merchants
  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setMerchantIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ids = await getUserMerchantIds();
      setMerchantIds(ids);
      if (ids.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error: ordersError } = await supabase
        .from(TABLE_NAMES.orders)
        .select('*')
        .in('merchant_id', ids)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(data ?? []);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message ?? 'Error al cargar los pedidos');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user, getUserMerchantIds]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders based on selected status
  const filteredOrders = orders.filter(
    (order) => !filterStatus || order.status === filterStatus
  );

  // Helper to get allowed next statuses based on current status
  const getAllowedTransitions = useCallback((status: OrderStatus): OrderStatus[] => {
    switch (status) {
      case 'payment_pending':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['preparing', 'cancelled'];
      case 'preparing':
        return ['ready'];
      case 'ready':
        return ['on_the_way'];
      case 'on_the_way':
        return ['delivered'];
      case 'delivered':
      case 'cancelled':
      default:
        return [];
    }
  }, []);

  // Handler to update order status
  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      try {
        const { error } = await supabase
          .from(TABLE_NAMES.orders)
          .update({ status: newStatus })
          .eq('id', orderId);

        if (error) throw error;
        await fetchOrders();
      } catch (err: any) {
        console.error('Failed to update order status:', err);
        setError(err.message ?? 'Error al actualizar el estado');
      }
    },
    [fetchOrders]
  );

  // Open modal to view proof with signed URL support
  const openProofModal = useCallback(async (order: OrderRow) => {
    setSelectedOrder(order);
    setModalOpen(true);
    setSignedProofUrl(order.payment_proof_url);

    if (order.payment_proof_url && supabase.storage?.from) {
      try {
        // Extract relative storage path if payment_proof_url contains full URL or path
        let storagePath = order.payment_proof_url;
        if (storagePath.includes(`${PAYMENT_PROOF_BUCKET}/`)) {
          storagePath = storagePath.split(`${PAYMENT_PROOF_BUCKET}/`)[1];
        }

        const { data, error: storageError } = await supabase.storage
          .from(PAYMENT_PROOF_BUCKET)
          .createSignedUrl(storagePath, 3600);

        if (!storageError && data?.signedUrl) {
          setSignedProofUrl(data.signedUrl);
        }
      } catch (err) {
        console.warn('Could not generate signed URL for payment proof:', err);
      }
    }
  }, []);

  const closeProofModal = useCallback(() => {
    setSelectedOrder(null);
    setModalOpen(false);
    setSignedProofUrl(null);
  }, []);

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md text-red-700">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-medium text-gray-600">Cargando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Pestañas de Navegación del Comercio */}
        <div className="flex border-b border-gray-200 mb-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Gestión de Pedidos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'catalog'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Catálogo
          </button>
        </div>

        {activeTab === 'catalog' ? (
          merchantIds.length > 0 ? (
            <ProductManagement merchantId={merchantIds[0]} />
          ) : (
            <p className="text-center py-8 text-gray-500">
              No tienes ningún comercio activo asociado para gestionar su catálogo.
            </p>
          )
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Panel de Comercio - Gestión de Pedidos
              </h1>
                <div className="flex items-center gap-3">
                <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
              Filtrar por estado:
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OrderStatus)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos los estados</option>
              {[
                'payment_pending',
                'confirmed',
                'preparing',
                'ready',
                'on_the_way',
                'delivered',
                'cancelled',
              ].map((status) => (
                <option key={status} value={status}>
                  {status === 'payment_pending'
                    ? 'Pendiente de Pago'
                    : status === 'confirmed'
                    ? 'Confirmado'
                    : status === 'preparing'
                    ? 'En Preparación'
                    : status === 'ready'
                    ? 'Listo'
                    : status === 'on_the_way'
                    ? 'En Camino'
                    : status === 'delivered'
                    ? 'Entregado'
                    : 'Cancelado'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders table or empty state */}
        {filteredOrders.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            No hay pedidos que mostrar{' '}
            {filterStatus ? `con estado ${filterStatus}` : ''}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Cliente
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Total
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Estado
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Pago
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-800">
                      {order.id}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-800">
                      {order.customer_id
                        ? `Cliente ${order.customer_id.slice(0, 6)}...`
                        : 'Cliente General'}
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          order.status === 'payment_pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'preparing'
                            ? 'bg-indigo-100 text-indigo-800'
                            : order.status === 'ready'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'on_the_way'
                            ? 'bg-purple-100 text-purple-800'
                            : order.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {order.status === 'payment_pending'
                          ? 'Pendiente de Pago'
                          : order.status === 'confirmed'
                          ? 'Confirmado'
                          : order.status === 'preparing'
                          ? 'En Preparación'
                          : order.status === 'ready'
                          ? 'Listo'
                          : order.status === 'on_the_way'
                          ? 'En Camino'
                          : order.status === 'delivered'
                          ? 'Entregado'
                          : 'Cancelado'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span className="font-medium">
                        {order.payment_method === 'pago_movil'
                          ? 'Pago Móvil'
                          : order.payment_method === 'cash'
                          ? 'Efectivo'
                          : order.payment_method === 'zelle'
                          ? 'Zelle'
                          : 'Tarjeta'}
                      </span>
                      {order.payment_reference && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          Ref: {order.payment_reference}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {order.payment_proof_url && (
                          <button
                            onClick={() => openProofModal(order)}
                            className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded font-medium transition-colors"
                          >
                            Ver comprobante
                          </button>
                        )}
                        {getAllowedTransitions(order.status).map((nextStatus) => {
                          const labelMap: Record<OrderStatus, string> = {
                            confirmed: 'Aceptar pago',
                            preparing: 'Marcar como preparando',
                            ready: 'Marcar como listo',
                            on_the_way: 'Enviar para entrega',
                            delivered: 'Marcar como entregado',
                            cancelled: 'Rechazar',
                            payment_pending: 'Pendiente',
                          };
                          const label = labelMap[nextStatus] ?? nextStatus;
                          return (
                            <button
                              key={nextStatus}
                              onClick={() => handleStatusChange(order.id, nextStatus)}
                              className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                                nextStatus === 'confirmed'
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : nextStatus === 'preparing'
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : nextStatus === 'ready'
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  : nextStatus === 'on_the_way'
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : nextStatus === 'delivered'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal for proof */}
        {modalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Comprobante de Pago
                </h2>
                <button
                  onClick={closeProofModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-bold"
                  aria-label="Cerrar modal"
                >
                  ×
                </button>
              </div>
              <div className="mb-4 space-y-1 bg-gray-50 p-3 rounded text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Pedido ID:</span> {selectedOrder.id}
                </p>
                <p>
                  <span className="font-semibold">Monto:</span>{' '}
                  {formatPrice(selectedOrder.total_amount)}
                </p>
                <p>
                  <span className="font-semibold">Método:</span>{' '}
                  {selectedOrder.payment_method === 'pago_movil'
                    ? 'Pago Móvil'
                    : selectedOrder.payment_method}
                </p>
                {selectedOrder.payment_reference && (
                  <p>
                    <span className="font-semibold">Referencia:</span>{' '}
                    {selectedOrder.payment_reference}
                  </p>
                )}
              </div>
              {signedProofUrl ? (
                <div className="flex justify-center bg-gray-100 p-2 rounded">
                  <img
                    src={signedProofUrl}
                    alt="Comprobante de Pago"
                    className="max-w-full h-auto rounded border border-gray-200 max-h-[400px] object-contain"
                  />
                </div>
              ) : (
                <p className="text-center text-gray-500 py-6">
                  No hay comprobante disponible.
                </p>
              )}
            </div>
          </div>
        )}
      </>
        )}
      </div>
    </div>
  );
}
export const MerchantDashboardPage = MerchantDashboard;
