import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, MapPin, CreditCard, Printer, Clock } from 'lucide-react';

// Tipos basados en la estructura existente
type OrderStatus = 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Customer {
  name: string;
  phone: string;
  address?: string;
  table?: string;
}

interface Rider {
  id: string;
  name: string;
  photo: string;
  status: 'available' | 'busy' | 'en_route' | 'delivered';
}

interface Order {
  id: string;
  status: OrderStatus;
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  paymentStatus: 'pending' | 'confirmed';
  paymentReference?: string;
  rider?: Rider;
  createdAt: Date;
  type: 'delivery' | 'dine_in';
}

// Datos de muestra
const sampleOrder: Order = {
  id: '001',
  status: 'confirmed',
  customer: {
    name: 'María García',
    phone: '+1234567890',
    address: 'Calle Principal 123, Ciudad',
    table: undefined,
  },
  items: [
    { id: '1', name: 'Pizza Margherita', quantity: 2, price: 12.99, notes: 'Sin cebolla' },
    { id: '2', name: 'Ensalada César', quantity: 1, price: 8.50 },
    { id: '3', name: 'Refresco Cola', quantity: 3, price: 2.50 },
  ],
  subtotal: 38.48,
  tax: 3.85,
  discount: 0,
  total: 42.33,
  paymentMethod: 'card',
  paymentStatus: 'confirmed',
  paymentReference: undefined,
  rider: {
    id: 'r1',
    name: 'Carlos Rodríguez',
    photo: '/rider-photo.jpg',
    status: 'en_route',
  },
  createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
  type: 'delivery',
};

const sampleRiders: Rider[] = [
  { id: 'r1', name: 'Carlos Rodríguez', photo: '/rider1.jpg', status: 'available' },
  { id: 'r2', name: 'Ana López', photo: '/rider2.jpg', status: 'available' },
  { id: 'r3', name: 'Pedro Martínez', photo: '/rider3.jpg', status: 'busy' },
];

export default function OperatorOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; newStatus: OrderStatus } | null>(null);
  const [selectedRider, setSelectedRider] = useState<string>('');

  useEffect(() => {
    // Simular fetch del pedido
    const fetchOrder = async () => {
      try {
        // En una app real, aquí iría la llamada a la API
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (params.id === '001') {
          setOrder(sampleOrder);
        } else {
          setError('Pedido no encontrado');
        }
      } catch (err) {
        setError('Error al cargar el pedido');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id]);

  useEffect(() => {
    if (!order) return;

    const updateElapsedTime = () => {
      const now = new Date();
      const diff = now.getTime() - order.createdAt.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes % 60}m`);
      } else {
        setElapsedTime(`${minutes}m`);
      }
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [order]);

  const handleAction = (action: string, newStatus: OrderStatus) => {
    setPendingAction({ action, newStatus });
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    if (!pendingAction || !order) return;

    // Simular cambio de estado
    setOrder({ ...order, status: pendingAction.newStatus });
    setShowConfirmModal(false);
    setPendingAction(null);

    // Si es asignar repartidor, asignar el seleccionado
    if (pendingAction.action === 'assign_rider' && selectedRider) {
      const rider = sampleRiders.find(r => r.id === selectedRider);
      if (rider) {
        setOrder({ ...order, status: 'ready', rider: { ...rider, status: 'en_route' } });
      }
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      cooking: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      cooking: 'Cocinando',
      ready: 'Listo',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getActionButtons = () => {
    if (!order) return null;

    switch (order.status) {
      case 'pending':
        return (
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('confirm', 'confirmed')}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
            >
              Confirmar Pedido
            </button>
            <button
              onClick={() => handleAction('reject', 'cancelled')}
              className="flex-1 border border-red-300 text-red-600 py-3 px-4 rounded-lg font-medium hover:bg-red-50"
            >
              Rechazar
            </button>
          </div>
        );
      case 'confirmed':
        return (
          <button
            onClick={() => handleAction('start_cooking', 'cooking')}
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700"
          >
            Iniciar Preparación
          </button>
        );
      case 'cooking':
        return (
          <button
            onClick={() => handleAction('mark_ready', 'ready')}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700"
          >
            Marcar como Listo
          </button>
        );
      case 'ready':
        return (
          <div className="space-y-3">
            <select
              value={selectedRider}
              onChange={(e) => setSelectedRider(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Seleccionar repartidor</option>
              {sampleRiders.filter(r => r.status === 'available').map(rider => (
                <option key={rider.id} value={rider.id}>{rider.name}</option>
              ))}
            </select>
            <button
              onClick={() => handleAction('assign_rider', 'ready')}
              disabled={!selectedRider}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Asignar Repartidor
            </button>
            {order.type === 'dine_in' && (
              <button
                onClick={() => handleAction('deliver_table', 'delivered')}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700"
              >
                Entregar en Mesa
              </button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-gray-800 font-medium">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">#{order.id}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              {getStatusBadge(order.status)}
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                {elapsedTime}
              </div>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Datos del Cliente */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Cliente</h2>
          <div className="space-y-3">
            <p className="text-gray-900 font-medium">{order.customer.name}</p>
            <div className="flex items-center text-gray-600">
              <Phone className="w-4 h-4 mr-2" />
              <a href={`tel:${order.customer.phone}`} className="hover:text-blue-600">
                {order.customer.phone}
              </a>
            </div>
            {order.type === 'delivery' && order.customer.address && (
              <div className="flex items-start text-gray-600">
                <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                <span>{order.customer.address}</span>
              </div>
            )}
            {order.type === 'dine_in' && order.customer.table && (
              <p className="text-gray-600">Mesa: {order.customer.table}</p>
            )}
          </div>
        </div>

        {/* Pedido */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pedido</h2>
          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">
                    {item.quantity}x {item.name}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-gray-500 mt-1">Nota: {item.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gray-900">${item.price.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">${(item.quantity * item.price).toFixed(2)}</p>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Impuestos</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>TOTAL</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pago</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 mr-3 text-gray-400" />
              <span className="text-gray-900 capitalize">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estado</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                order.paymentStatus === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {order.paymentStatus === 'confirmed' ? 'Confirmado' : 'Pendiente'}
              </span>
            </div>
            {order.paymentReference && (
              <div className="flex justify-between">
                <span className="text-gray-600">Referencia</span>
                <span className="text-gray-900">{order.paymentReference}</span>
              </div>
            )}
          </div>
        </div>

        {/* Repartidor */}
        {order.rider && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Repartidor</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={order.rider.photo}
                  alt={order.rider.name}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <p className="text-gray-900 font-medium">{order.rider.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{order.rider.status.replace('_', ' ')}</p>
                </div>
              </div>
              <button className="flex items-center text-blue-600 hover:text-blue-800">
                <MapPin className="w-4 h-4 mr-1" />
                Ver mapa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Acciones Sticky */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        {getActionButtons()}
      </div>

      {/* Modal de Confirmación */}
      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">¿Estás seguro?</h3>
            <p className="text-gray-600 mb-6">
              ¿Quieres {pendingAction.action === 'confirm' ? 'confirmar' : 
                       pendingAction.action === 'reject' ? 'rechazar' : 
                       pendingAction.action === 'start_cooking' ? 'iniciar la preparación' :
                       pendingAction.action === 'mark_ready' ? 'marcar como listo' :
                       pendingAction.action === 'assign_rider' ? 'asignar el repartidor' :
                       'entregar en mesa'} este pedido?
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
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}