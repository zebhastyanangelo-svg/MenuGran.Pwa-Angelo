'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPhone, faMapPin, faCreditCard, faPrint, faClock, faTriangleExclamation, faUtensils, faMotorcycle } from '@fortawesome/free-solid-svg-icons';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  id: string;
  quantity: number;
  menuItem: {
    id: string;
    name: string;
    price: number;
  };
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
}

interface Order {
  id: string;
  number: string;
  serviceType: 'MESA' | 'DELIVERY';
  tableNumber: number | null;
  status: OrderStatus;
  total: number;
  paymentMethod: string;
  client: Client;
  deliveryAddress: string | null;
  notes: string | null;
  items: OrderItem[];
  rider: Rider | null;
  createdAt: string;
}

interface RiderOption {
  id: string;
  name: string;
  status: string;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
  PREPARING: { label: 'Cocinando', color: 'bg-orange-100 text-orange-800' },
  READY: { label: 'Listo', color: 'bg-green-100 text-green-800' },
  DELIVERING: { label: 'En entrega', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Entregado', color: 'bg-gray-100 text-gray-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-brand-100 text-brand-700' },
};

const getNextAction = (order: Order): { action: string; status: OrderStatus } | null => {
  if (order.status === 'PENDING') return { action: 'confirm', status: 'CONFIRMED' };
  if (order.status === 'CONFIRMED') return { action: 'start_cooking', status: 'PREPARING' };
  if (order.status === 'PREPARING') return { action: 'mark_ready', status: 'READY' };
  if (order.status === 'READY') {
    if (order.serviceType === 'DELIVERY') return { action: 'assign_rider', status: 'DELIVERING' };
    return { action: 'deliver_table', status: 'DELIVERED' };
  }
  return null;
};

export default function OperatorOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; newStatus: OrderStatus } | null>(null);
  const [selectedRider, setSelectedRider] = useState('');
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [updating, setUpdating] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const [orderRes, ridersRes] = await Promise.all([
        fetch(`/api/operator/orders/${params.id}`),
        fetch('/api/operator/riders'),
      ]);
      if (!orderRes.ok) {
        setError('Pedido no encontrado');
        return;
      }
      const orderJson = await orderRes.json();
      setOrder(orderJson.data as Order);
      if (ridersRes.ok) {
        const ridersJson = await ridersRes.json();
        setRiders(ridersJson.data);
      }
    } catch {
      setError('Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  useEffect(() => {
    if (!order) return;
    const updateElapsedTime = () => {
      const diff = Date.now() - new Date(order.createdAt).getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      setElapsedTime(hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`);
    };
    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 60000);
    return () => clearInterval(interval);
  }, [order]);

  const handleAction = (action: string, newStatus: OrderStatus) => {
    setPendingAction({ action, newStatus });
    setShowConfirmModal(true);
  };

  const confirmAction = async () => {
    if (!pendingAction || !order) return;
    setUpdating(true);
    try {
      const body: Record<string, unknown> = { status: pendingAction.newStatus };
      if (pendingAction.action === 'assign_rider' && selectedRider) {
        body.riderId = selectedRider;
      }
      const res = await fetch(`/api/operator/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update');
      const json = await res.json();
      setOrder(json.data as Order);
      if (pendingAction.action === 'assign_rider' && selectedRider) {
        setSelectedRider('');
      }
      setShowConfirmModal(false);
      setPendingAction(null);
    } catch (err) {
      console.error('Error updating order:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-brand-500 text-xl mb-4" />
          <p className="text-gray-800 font-medium">{error || 'Pedido no encontrado'}</p>
          <button onClick={() => window.history.back()} className="mt-4 text-blue-600 hover:text-blue-800">
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const nextAction = getNextAction(order);
  const isDelivery = order.serviceType === 'DELIVERY';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => window.history.back()} className="flex items-center text-gray-600 hover:text-gray-800">
            <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 mr-2" />
            Volver
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{order.number}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                {statusConfig[order.status]?.label || order.status}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDelivery ? 'bg-yellow-100 text-yellow-800' : 'bg-brand-100 text-brand-700'}`}>
                {isDelivery ? <><FontAwesomeIcon icon={faMotorcycle} className="mr-1" /> Delivery</> : <><FontAwesomeIcon icon={faUtensils} className="mr-1" /> Mesa {order.tableNumber || ''}</>}
              </span>
              <div className="flex items-center text-sm text-gray-500">
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 mr-1" />
                {elapsedTime}
              </div>
            </div>
          </div>
          <button onClick={() => window.print()} className="flex items-center text-gray-600 hover:text-gray-800">
            <FontAwesomeIcon icon={faPrint} className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Cliente</h2>
          <div className="space-y-3">
            <p className="text-gray-900 font-medium">{order.client.name}</p>
            <div className="flex items-center text-gray-600">
              <FontAwesomeIcon icon={faPhone} className="w-4 h-4 mr-2" />
              <a href={`tel:${order.client.phone}`} className="hover:text-blue-600">{order.client.phone}</a>
            </div>
            {isDelivery && order.deliveryAddress && (
              <div className="flex items-start text-gray-600">
                <FontAwesomeIcon icon={faMapPin} className="w-4 h-4 mr-2 mt-0.5" />
                <span>{order.deliveryAddress}</span>
              </div>
            )}
            {!isDelivery && order.tableNumber && (
              <p className="text-gray-600 font-semibold">Mesa: {order.tableNumber}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pedido</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">{item.quantity}x {item.menuItem.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900">{formatPrice(item.menuItem.price)}</p>
                  <p className="text-sm text-gray-500">{formatPrice(item.quantity * item.menuItem.price)}</p>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-xl font-bold text-gray-900">
                <span>TOTAL</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pago</h2>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCreditCard} className="w-5 h-5 mr-3 text-gray-400" />
            <span className="text-gray-900 capitalize">{order.paymentMethod}</span>
          </div>
        </div>

        {order.rider && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Repartidor</h2>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center mr-3">
                <span className="text-brand-500 font-bold text-sm">
                  {order.rider.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">{order.rider.name}</p>
                <p className="text-sm text-gray-500">{order.rider.phone}</p>
              </div>
            </div>
          </div>
        )}

        {order.notes && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas</h2>
            <p className="text-gray-600">{order.notes}</p>
          </div>
        )}
      </div>

      {nextAction && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          {nextAction.action === 'assign_rider' ? (
            <div className="space-y-3">
              <select
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Seleccionar repartidor</option>
                {riders.filter((r) => r.status === 'available').map((rider) => (
                  <option key={rider.id} value={rider.id}>{rider.name}</option>
                ))}
              </select>
              <button
                onClick={() => handleAction('assign_rider', 'DELIVERING')}
                disabled={!selectedRider}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Asignar Repartidor
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleAction(nextAction.action, nextAction.status)}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
              >
                {nextAction.action === 'confirm' && 'Confirmar Pedido'}
                {nextAction.action === 'start_cooking' && 'Iniciar Preparación'}
                {nextAction.action === 'mark_ready' && 'Marcar como Listo'}
                {nextAction.action === 'deliver_table' && 'Entregar en Mesa'}
              </button>
              {order.status === 'PENDING' && (
                <button
                  onClick={() => handleAction('reject', 'CANCELLED')}
                  className="flex-1 border border-red-300 text-brand-500 py-3 px-4 rounded-lg font-medium hover:bg-brand-50"
                >
                  Rechazar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">¿Estás seguro?</h3>
            <p className="text-gray-600 mb-6">
              {pendingAction.action === 'confirm' ? '¿Quieres confirmar este pedido?' :
               pendingAction.action === 'reject' ? '¿Quieres rechazar este pedido?' :
               pendingAction.action === 'start_cooking' ? '¿Quieres iniciar la preparación?' :
               pendingAction.action === 'mark_ready' ? '¿Quieres marcar como listo?' :
               pendingAction.action === 'deliver_table' ? '¿Quieres entregar en mesa?' :
               '¿Quieres realizar esta acción?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                disabled={updating}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Actualizando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
