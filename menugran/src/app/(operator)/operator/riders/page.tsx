'use client';

import React, { useState, useEffect } from 'react';
import { User, Clock, CheckCircle, MapPin, Bike, X } from 'lucide-react';

interface Rider {
  id: string;
  name: string;
  status: 'available' | 'delivering' | 'inactive';
  deliveredToday: number;
  avgDeliveryTime: number;
}

interface Order {
  id: string;
  customer: { name: string; address: string };
  total: number;
  createdAt: Date;
}

const sampleRiders: Rider[] = [
  { id: 'r1', name: 'Carlos Rodriguez', status: 'available', deliveredToday: 8, avgDeliveryTime: 25 },
  { id: 'r2', name: 'Ana Lopez', status: 'delivering', deliveredToday: 12, avgDeliveryTime: 22 },
  { id: 'r3', name: 'Pedro Martinez', status: 'available', deliveredToday: 6, avgDeliveryTime: 28 },
  { id: 'r4', name: 'Maria Gonzalez', status: 'inactive', deliveredToday: 0, avgDeliveryTime: 0 },
  { id: 'r5', name: 'Luis Fernandez', status: 'delivering', deliveredToday: 15, avgDeliveryTime: 20 },
  { id: 'r6', name: 'Sofia Ramirez', status: 'available', deliveredToday: 9, avgDeliveryTime: 26 },
];

const sampleReadyOrders: Order[] = [
  { id: '001', customer: { name: 'Maria Garcia', address: 'Calle Principal 123' }, total: 42.33, createdAt: new Date(Date.now() - 10 * 60000) },
  { id: '002', customer: { name: 'Juan Perez', address: 'Av. Central 456' }, total: 28.50, createdAt: new Date(Date.now() - 15 * 60000) },
  { id: '003', customer: { name: 'Laura Torres', address: 'Plaza Mayor 789' }, total: 35.75, createdAt: new Date(Date.now() - 20 * 60000) },
];

const formatPrice = (v: number) => '$' + v.toLocaleString('es-CO');

export default function OperatorRidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'delivering'>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setRiders(sampleRiders);
        setReadyOrders(sampleReadyOrders);
      } catch (err) {
        // error silencioso
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredRiders = riders.filter((rider) => {
    if (filter === 'all') return true;
    if (filter === 'available') return rider.status === 'available';
    if (filter === 'delivering') return rider.status === 'delivering';
    return true;
  });

  const getStatusBadge = (status: Rider['status']) => {
    const badges = {
      available: 'bg-green-100 text-green-700',
      delivering: 'bg-blue-100 text-blue-700',
      inactive: 'bg-gray-100 text-gray-600',
    };
    const labels = {
      available: 'Disponible',
      delivering: 'En entrega',
      inactive: 'Inactivo',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const handleAssignClick = (rider: Rider) => {
    setSelectedRider(rider);
    setSelectedOrder('');
    setShowAssignModal(true);
  };

  const handleAssignOrder = () => {
    if (!selectedRider || !selectedOrder) return;
    setRiders((prev) =>
      prev.map((r) => (r.id === selectedRider.id ? { ...r, status: 'delivering' as const } : r))
    );
    setReadyOrders((prev) => prev.filter((o) => o.id !== selectedOrder));
    setShowAssignModal(false);
    setSelectedRider(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full mr-3" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const availableCount = riders.filter((r) => r.status === 'available').length;
  const deliveringCount = riders.filter((r) => r.status === 'delivering').length;

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Repartidores</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{riders.length}</p>
            </div>
            <Bike className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Disponibles</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{availableCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En Entrega</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{deliveringCount}</p>
            </div>
            <Bike className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'available', 'delivering'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'available' ? 'Disponibles' : 'En entrega'}
          </button>
        ))}
      </div>

      {/* Riders Grid */}
      {filteredRiders.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay repartidores en esta categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRiders.map((rider) => (
            <div key={rider.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-red-600 font-bold">{getInitials(rider.name)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{rider.name}</h3>
                  {getStatusBadge(rider.status)}
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Entregas hoy
                  </span>
                  <span className="font-medium">{rider.deliveredToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Tiempo promedio
                  </span>
                  <span className="font-medium">
                    {rider.avgDeliveryTime > 0 ? `${rider.avgDeliveryTime} min` : 'N/A'}
                  </span>
                </div>
              </div>

              {rider.status === 'available' && (
                <button
                  onClick={() => handleAssignClick(rider)}
                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                >
                  Asignar pedido
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Asignar a {selectedRider.name}
                </h3>
                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {readyOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-6">No hay pedidos listos para entregar</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {readyOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition ${
                        selectedOrder === order.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">Pedido #{order.id}</p>
                          <p className="text-sm text-gray-600">{order.customer.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {order.customer.address}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatPrice(order.total)}</p>
                          <p className="text-xs text-gray-400">
                            Hace {Math.floor((now - order.createdAt.getTime()) / 60000)} min
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignOrder}
                  disabled={!selectedOrder || readyOrders.length === 0}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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