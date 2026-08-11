import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { OrderRow, OrderStatus } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import {
  useNotifications,
  buildOrderNotification,
} from '../hooks/useNotifications';
import { useNotificationToast } from '../components/pwa/NotificationToast';
import { statusDisplayMap } from '../utils/statusDisplayMap';

export function OrderTracker() {
  const { user, isLoading: authLoading } = useAuth();
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useNotificationToast();
  const { permission, showNotification } = useNotifications();
  const previousStatusRef = useRef<OrderStatus | null>(null);

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

  // Order status progression for visual stepper
  const orderStatusSteps: OrderStatus[] = [
    'payment_pending',
    'confirmed', 
    'preparing',
    'ready',
    'on_the_way',
    'delivered',
    'cancelled'
  ];

  // Load order data
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
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Error al cargar la orden');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Set up real-time subscription for order updates
  useEffect(() => {
    loadOrder();

    // Subscribe to changes on the orders table
    const channel = supabase
      .channel(`order-changes-${orderId}`)
         .on(
         'postgres_changes',
         { 
           event: 'UPDATE', 
           schema: 'public', 
           table: 'orders',
           filter: `id=eq.${orderId}`
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

    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrder, orderId, handleStatusChange]);

  // Handle loading states
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-600">
        <p className="text-lg font-medium">Cargando sesión...</p>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 border-l-4 border-red-500">
        <h2 className="text-red-800 font-bold mb-2">Error</h2>
        <p className="text-red-700">{error}</p>
        <button 
          onClick={() => navigate('/marketplace', { replace: true })}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Volver al mercado
        </button>
      </div>
    );
  }

  // Show loading state
  if (loading || !order) {
    return (
      <div className="p-6 bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Cargando orden...</h2>
        <p className="text-gray-600">Por favor espere mientras cargamos la información de su orden.</p>
      </div>
    );
  }

  // Find current step index for progress bar
  const currentStepIndex = orderStatusSteps.indexOf(order.status);
  const isCompleted = order.status === 'delivered' || order.status === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Seguimiento de Orden #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <p className="text-gray-600">
          Estado actual: <span className="font-medium text-gray-800">{statusDisplayMap[order.status]}</span>
        </p>
      </header>

      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex space-x-4">
          {orderStatusSteps.map((status, index) => (
            <div key={status} className="flex-1 text-center relative">
              {/* Step Circle */}
              <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center rounded-full">
                {index < currentStepIndex && (
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414l-1.293 1.293zm-1.414 5.657a1 1 0 011.414 0l2-2a1 1 0 011.414 1.414l-2 2A1 1 0 018.707 14.95z" clipRule="evenodd" />
                  </svg>
                )}
                {index === currentStepIndex && (
                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="10" r="8" strokeWidth={2}/>
                  </svg>
                )}
                {index > currentStepIndex && (
                  <svg className="w-5 h-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="10" r="8"/>
                  </svg>
                )}
              </div>
              
              {/* Step Label */}
              <div className="text-xs font-medium text-gray-500">
                {status === 'payment_pending' && 'Pendiente'}
                {status === 'confirmed' && 'Confirmado'}
                {status === 'preparing' && 'Preparación'}
                {status === 'ready' && 'Listo'}
                {status === 'on_the_way' && 'En camino'}
                {status === 'delivered' && 'Entregado'}
                {status === 'cancelled' && 'Cancelado'}
              </div>
              
              {/* Connector Line */}
              {index < orderStatusSteps.length - 1 && (
                <div className="absolute left-1/2 -top-2 w-px h-4 -translate-x-1/2">
                  {index < currentStepIndex && (
                    <div className="bg-green-600 h-full"/>
                  )}
                  {index === currentStepIndex && !isCompleted && (
                    <div className="bg-blue-600 h-full"/>
                  )}
                  {index > currentStepIndex && (
                    <div className="bg-gray-200 h-full"/>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className="grid gap-6">
        {/* Order Summary Card */}
        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Resumen de la Orden</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha:</span>
              <span className="font-medium">{new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}</span>
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
              <span className="font-medium text-lg">${parseFloat(order.total_amount).toFixed(2)}</span>
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
       </div>

          {/* Products Card */}
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

        {/* Merchant Info Card */}
        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Información del Comercio</h2>
          
          {/* In a real app, we would fetch merchant data here */}
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

       {/* Actions */}
       {!isCompleted && (
         <div className="mt-8">
           <button 
             onClick={() => navigate('/marketplace', { replace: true })}
             className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
           >
             Volver al mercado
           </button>
         </div>
       )}
     </div>
   );
}