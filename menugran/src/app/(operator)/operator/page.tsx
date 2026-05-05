'use client';

import { useState } from 'react';
import { Package, Bike, Clock, Check, ChefHat, MapPin, User, Phone, CreditCard, TrendingUp, X, ArrowRight } from 'lucide-react';

const initialOrders = [
  { id: '1', number: '#001', type: 'delivery', status: 'PENDING', paymentMethod: 'Efectivo', clientName: 'Juan Perez', clientPhone: '04121111111', address: 'Calle 72 #10-34', items: 3, total: 45000, time: 'Hace 5 min' },
  { id: '2', number: '#002', type: 'local', status: 'PENDING', paymentMethod: 'Pago movil', clientName: 'Ana Garcia', clientPhone: '04122222222', address: 'Mesa 5', items: 2, total: 28000, time: 'Hace 8 min' },
  { id: '3', number: '#003', type: 'delivery', status: 'PREPARING', paymentMethod: 'Transferencia', clientName: 'Carlos Lopez', clientPhone: '04123333333', address: 'Av. Libertador', items: 4, total: 62000, time: 'Hace 12 min' },
  { id: '4', number: '#004', type: 'delivery', status: 'READY', paymentMethod: 'Efectivo', clientName: 'Maria Diaz', clientPhone: '04124444444', address: 'Carrera 15 #8-20', items: 3, total: 55000, time: 'Hace 3 min' },
];

const RIDERS = [
  { id: 'r1', name: 'Pedro Repartidor', available: true },
  { id: 'r2', name: 'Luis Moto', available: true },
];

const formatPrice = (v: number) => '$' + v.toLocaleString('es-CO');

export default function OperatorPage() {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<typeof initialOrders[0] | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;

  const filteredOrders = filter === 'all'
    ? orders.filter((o) => o.status !== 'DELIVERED')
    : orders.filter((o) => o.status.toUpperCase() === filter.toUpperCase());

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    PREPARING: 'bg-orange-100 text-orange-700',
    READY: 'bg-green-100 text-green-700',
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    PREPARING: 'Cocinando',
    READY: 'Listo',
  };

  const advanceOrder = (orderId: string) => {
    const flow: Record<string, string> = {
      PENDING: 'CONFIRMED',
      CONFIRMED: 'PREPARING',
      PREPARING: 'READY',
    };
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: flow[o.status] || o.status } : o))
    );
  };

  return (
    <div>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En Preparacion</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{preparingCount}</p>
            </div>
            <ChefHat className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Listos para Entregar</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{readyCount}</p>
            </div>
            <Package className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'preparing', 'ready'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'preparing' ? 'En Cocina' : 'Listos'}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Pedidos Activos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Pedido</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900 text-sm">{order.number}</span>
                    <p className="text-xs text-gray-400">{order.time}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{order.clientName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      {order.type === 'delivery' ? <Bike className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      {order.type === 'delivery' ? 'Delivery' : 'Local'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{order.items}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{formatPrice(order.total)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Ver
                      </button>
                      {['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status) && (
                        <button
                          onClick={() => advanceOrder(order.id)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay pedidos en esta categoria</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{selectedOrder.number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium">{selectedOrder.clientName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Telefono</span>
                <span className="font-medium flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {selectedOrder.clientPhone}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Tipo</span>
                <span className="font-medium flex items-center gap-1">
                  {selectedOrder.type === 'delivery' ? <Bike className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {selectedOrder.type === 'delivery' ? 'Delivery' : 'Local'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Direccion</span>
                <span className="font-medium text-right max-w-[180px]">{selectedOrder.address}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{selectedOrder.items}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-base">{formatPrice(selectedOrder.total)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Pago</span>
                <span className="font-medium flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> {selectedOrder.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Estado</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedOrder.status]}`}>
                  {statusLabels[selectedOrder.status]}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {['PENDING', 'CONFIRMED', 'PREPARING'].includes(selectedOrder.status) && (
                <button
                  onClick={() => { advanceOrder(selectedOrder.id); setSelectedOrder(null); }}
                  className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                >
                  {selectedOrder.status === 'PENDING' ? 'Confirmar Pedido' :
                   selectedOrder.status === 'CONFIRMED' ? 'Iniciar Preparacion' : 'Marcar como Listo'}
                </button>
              )}

              {selectedOrder.status === 'READY' && selectedOrder.type === 'delivery' && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Asignar repartidor disponible:</p>
                  {RIDERS.filter((r) => r.available).map((rider) => (
                    <button
                      key={rider.id}
                      onClick={() => setSelectedOrder(null)}
                      className="w-full py-2.5 mb-1 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
                    >
                      <Bike className="h-4 w-4" /> {rider.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}