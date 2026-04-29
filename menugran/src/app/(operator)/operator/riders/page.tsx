import React, { useState, useEffect } from 'react';
import { User, Clock, CheckCircle, MapPin } from 'lucide-react';

// Tipos
interface Rider {
  id: string;
  name: string;
  photo?: string;
  status: 'available' | 'delivering' | 'inactive';
  deliveredToday: number;
  avgDeliveryTime: number; // en minutos
}

interface Order {
  id: string;
  customer: { name: string; address: string };
  total: number;
  createdAt: Date;
}

// Datos de muestra
const sampleRiders: Rider[] = [
  {
    id: 'r1',
    name: 'Carlos Rodríguez',
    photo: '/rider1.jpg',
    status: 'available',
    deliveredToday: 8,
    avgDeliveryTime: 25,
  },
  {
    id: 'r2',
    name: 'Ana López',
    status: 'delivering',
    deliveredToday: 12,
    avgDeliveryTime: 22,
  },
  {
    id: 'r3',
    name: 'Pedro Martínez',
    photo: '/rider3.jpg',
    status: 'available',
    deliveredToday: 6,
    avgDeliveryTime: 28,
  },
  {
    id: 'r4',
    name: 'María González',
    status: 'inactive',
    deliveredToday: 0,
    avgDeliveryTime: 0,
  },
  {
    id: 'r5',
    name: 'Luis Fernández',
    photo: '/rider5.jpg',
    status: 'delivering',
    deliveredToday: 15,
    avgDeliveryTime: 20,
  },
  {
    id: 'r6',
    name: 'Sofia Ramírez',
    status: 'available',
    deliveredToday: 9,
    avgDeliveryTime: 26,
  },
];

const sampleReadyOrders: Order[] = [
  {
    id: '001',
    customer: { name: 'María García', address: 'Calle Principal 123' },
    total: 42.33,
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
  },
  {
    id: '002',
    customer: { name: 'Juan Pérez', address: 'Av. Central 456' },
    total: 28.50,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: '003',
    customer: { name: 'Laura Torres', address: 'Plaza Mayor 789' },
    total: 35.75,
    createdAt: new Date(Date.now() - 20 * 60 * 1000),
  },
];

export default function OperatorRidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'delivering'>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string>('');

  useEffect(() => {
    // Simular fetch de datos
    const fetchData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRiders(sampleRiders);
        setReadyOrders(sampleReadyOrders);
      } catch (err) {
        setError('Error al cargar los repartidores');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRiders = riders.filter(rider => {
    if (filter === 'all') return true;
    if (filter === 'available') return rider.status === 'available';
    if (filter === 'delivering') return rider.status === 'delivering';
    return true;
  });

  const getStatusBadge = (status: Rider['status']) => {
    const badges = {
      available: 'bg-green-100 text-green-800',
      delivering: 'bg-blue-100 text-blue-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      available: 'Disponible',
      delivering: 'En entrega',
      inactive: 'Inactivo',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleAssignClick = (rider: Rider) => {
    setSelectedRider(rider);
    setShowAssignModal(true);
  };

  const handleAssignOrder = () => {
    if (!selectedRider || !selectedOrder) return;

    // Simular asignación
    setRiders(prev => prev.map(r =>
      r.id === selectedRider.id ? { ...r, status: 'delivering' as const } : r
    ));
    setReadyOrders(prev => prev.filter(o => o.id !== selectedOrder));

    setShowAssignModal(false);
    setSelectedRider(null);
    setSelectedOrder('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando repartidores...</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Repartidores</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Disponibles
            </button>
            <button
              onClick={() => setFilter('delivering')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'delivering' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              En entrega
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Repartidores */}
      <div className="p-4">
        {filteredRiders.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay repartidores en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRiders.map(rider => (
              <div key={rider.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    {rider.photo ? (
                      <img
                        src={rider.photo}
                        alt={rider.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 font-medium">{getInitials(rider.name)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{rider.name}</h3>
                    {getStatusBadge(rider.status)}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Entregados hoy
                    </span>
                    <span className="font-medium text-gray-900">{rider.deliveredToday}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Tiempo promedio
                    </span>
                    <span className="font-medium text-gray-900">
                      {rider.avgDeliveryTime > 0 ? `${rider.avgDeliveryTime} min` : 'N/A'}
                    </span>
                  </div>
                </div>

                {rider.status === 'available' && (
                  <button
                    onClick={() => handleAssignClick(rider)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Asignar pedido
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Asignación */}
      {showAssignModal && selectedRider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Asignar pedido a {selectedRider.name}
              </h3>

              {readyOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay pedidos listos para entregar</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {readyOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrder === order.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">Pedido #{order.id}</p>
                          <p className="text-sm text-gray-600">{order.customer.name}</p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {order.customer.address}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${order.total.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">
                            {Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60))} min atrás
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedRider(null);
                    setSelectedOrder('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignOrder}
                  disabled={!selectedOrder || readyOrders.length === 0}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Asignar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}