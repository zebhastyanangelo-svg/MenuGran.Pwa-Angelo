import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { OrderRow, OrderStatus } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  saveOrder,
  getOrder,
} from '../utils/offlineStorage';
import {
  useNotifications,
  buildOrderNotification,
} from '../hooks/useNotifications';
import { useNotificationToast } from '../components/pwa/useNotificationToast';
import { statusDisplayMap } from '../utils/statusDisplayMap';
import { getOrderStatusLabel } from '../utils/orderStatus';
import { OrderStatusStep } from '../components/orders/OrderStatusStep';
import { getAllowedTransitions, getTransitionLabel, getTransitionButtonClass } from '../utils/orderStatus';

export function OrderTracker() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const { showToast } = useNotificationToast();
  const { permission, showNotification } = useNotifications();
  const { isOnline } = useOnlineStatus();
  const previousStatusRef = useRef<OrderStatus | null>(null);

  const adminRoles: string[] = ['superadmin', 'merchant_owner', 'merchant_staff'];
  const canManageOrders = profile !== null && adminRoles.includes(profile.role);

  const handleStatusChange = useCallback(
    (newStatus: OrderStatus): void => {
      const notification = buildOrderNotification(newStatus);

      if (permission === 'granted') {
        showNotification(notification);
      } else {
        showToast({
          title: notification.title,
          message: notification.body,
          variant:
            newStatus === 'cancelled'
              ? 'error'
              : newStatus === 'delivered'
                ? 'success'
                : newStatus === 'ready'
                  ? 'warning'
                  : 'info',
          durationMs: 6000,
        });
      }
    },
    [permission, showNotification, showToast],
  );

  const orderStatusSteps: OrderStatus[] = [
    'payment_pending',
    'confirmed',
    'preparing',
    'ready',
    'on_the_way',
    'delivered',
    'cancelled'
  ];

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError('ID de orden no proporcionado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!data) {
        setError('Orden no encontrada');
        setLoading(false);
        return;
      }

      setOrder(data);
      previousStatusRef.current = data.status;
      setError(null);
      saveOrder(data);
    } catch (err) {
      console.error('Error loading order:', err);

      if (!isOnline) {
        const cachedOrder = getOrder(orderId);
        if (cachedOrder) {
          setOrder(cachedOrder);
          previousStatusRef.current = cachedOrder.status;
          setError(null);
          showToast({
            title: 'Modo sin conexión',
            message: 'Mostrando la última orden guardada localmente.',
            variant: 'warning',
            durationMs: 6000,
          });
        } else {
          setError('Error al cargar la orden. Activa la conexión para ver tu orden.');
          setOrder(null);
        }
      } else {
        setError('Error al cargar la orden');
        setOrder(null);
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, isOnline, showToast]);

  useEffect(() => {
    loadOrder();

    const channel = supabase
      .channel(`order-changes-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as OrderRow;
          setOrder(updatedOrder);

          if (updatedOrder.status !== previousStatusRef.current) {
            previousStatusRef.current = updatedOrder.status;
            handleStatusChange(updatedOrder.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrder, orderId, handleStatusChange]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-600">
        <p className="text-lg font-medium">Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-l-4 border-red-500">
        <h2 className="text-red-800 font-bold mb-2">Error</h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (loading || !order) {
    return (
      <div className="p-6 bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Cargando orden...</h2>
        <p className="text-gray-600">Por favor espere mientras cargamos la información de su orden.</p>
      </div>
    );
  }

  const currentStepIndex = orderStatusSteps.indexOf(order.status);
  const isCompleted = order.status === 'delivered' || order.status === 'cancelled';
  const allowedTransitions = getAllowedTransitions(order.status);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Seguimiento de Orden #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <p className="text-gray-600">
          Estado actual:{' '}
          <span className="font-medium text-gray-800">
            {statusDisplayMap[order.status]}
          </span>
        </p>
      </header>

      <div className="mb-8 overflow-x-auto">
        <div className="flex items-start justify-between min-w-[600px]">
          {orderStatusSteps.map((status, index) => (
            <OrderStatusStep
              key={status}
              status={status}
              currentIndex={currentStepIndex}
              index={index}
              isCompleted={isCompleted}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Resumen de la Orden</h2>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha:</span>
              <span className="font-medium">
                {new Date(order.created_at).toLocaleDateString()}{' '}
                {new Date(order.created_at).toLocaleTimeString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium capitalize">{order.type}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Método de pago:</span>
              <span className="font-medium capitalize">{order.payment_method}</span>
              {order.payment_method === 'pago_movil' && order.payment_reference && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Ref: {order.payment_reference}
                </span>
              )}
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium text-lg">
                ${parseFloat(order.total_amount).toFixed(2)}
              </span>
            </div>

            {order.table_number && (
              <div className="flex justify-between">
                <span className="text-gray-600">Mesa:</span>
                <span className="font-medium">#{order.table_number}</span>
              </div>
            )}

            {order.delivery_address_notes && (
              <div className="flex justify-between">
                <span className="text-gray-600">Instrucciones de entrega:</span>
                <span className="text-gray-700">{order.delivery_address_notes}</span>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Productos del Pedido</h2>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={`${item.product_id}-${index}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-semibold text-gray-800">{item.product_id}</p>
                    <p className="text-sm text-gray-500">Cantidad: {item.quantity} x ${item.unit_price}</p>
                  </div>
                  <p className="font-bold text-gray-900">${(item.quantity * item.unit_price).toFixed(2)}</p>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-gray-200 text-right">
                <span className="text-gray-600 mr-2">Total:</span>
                <span className="text-xl font-bold text-emerald-600">${parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No hay productos en esta orden.</p>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Información del Comercio</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">ID de Comercio:</span>
              <span className="font-medium">{order.merchant_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-medium">{order.customer_id || 'Cliente invitado'}</span>
            </div>
          </div>
        </section>

        {!isCompleted && canManageOrders && allowedTransitions.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Transiciones disponibles:</p>
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    onClick={() => setExpandedStep(expandedStep === nextStatus ? null : nextStatus)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      expandedStep === nextStatus
                        ? 'bg-brand-red text-white'
                        : getTransitionButtonClass(nextStatus)
                    }`}
                    data-testid={`transition-${nextStatus}`}
                  >
                    {expandedStep === nextStatus ? 'Cerrar' : getTransitionLabel(nextStatus)}
                  </button>
                ))}
              </div>
              {expandedStep && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">
                    Cambiar estado a: <strong>{getOrderStatusLabel(expandedStep as OrderStatus)}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}