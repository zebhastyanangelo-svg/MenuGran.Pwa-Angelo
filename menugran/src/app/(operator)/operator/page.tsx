'use client';

import { useState, useEffect } from 'react';
import { Package, Bike, Clock, ChefHat, MapPin, User, Phone, CreditCard, X, ArrowRight } from 'lucide-react';

interface Order {
  id: string;
  number: string;
  type: string;
  status: string;
  paymentMethod: string;
  clientName: string;
  clientPhone: string;
  address: string;
  items: number;
  total: number;
  notes: string | null;
  createdAt: string;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const statusColors: Record<string, string> = {
  PENDING: 'badge-warning',
  CONFIRMED: 'badge-brand',
  PREPARING: 'bg-warning-50 text-warning-600',
  READY: 'badge-success',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Cocinando',
  READY: 'Listo',
  DELIVERING: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export default function OperatorPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, ridersRes] = await Promise.all([
          fetch('/api/operator/orders'),
          fetch('/api/operator/riders'),
        ]);
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.data);
        }
        if (ridersRes.ok) {
          const ridersData = await ridersRes.json();
          setRiders(ridersData.data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;

  const filteredOrders = filter === 'all'
    ? orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
    : orders.filter((o) => o.status.toUpperCase() === filter.toUpperCase());

  const advanceOrder = async (orderId: string) => {
    const flow: Record<string, string> = { PENDING: 'CONFIRMED', CONFIRMED: 'PREPARING', PREPARING: 'READY' };
    const current = orders.find((o) => o.id === orderId);
    if (!current) return;
    const nextStatus = flow[current.status];
    if (!nextStatus) return;
    try {
      const res = await fetch(`/api/operator/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) return;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
    } catch {}
  };

  const assignRider = async (orderId: string, riderId: string) => {
    try {
      const res = await fetch(`/api/operator/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERING', riderId }),
      });
      if (!res.ok) return;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'DELIVERING' } : o)));
      setSelectedOrder(null);
    } catch {}
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-soft p-5 border border-neutral-200 animate-pulse">
              <div className="h-8 bg-neutral-200 rounded w-2/3 mb-2" />
              <div className="h-6 bg-neutral-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6 animate-pulse">
          <div className="h-6 bg-neutral-200 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-neutral-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-soft p-5 border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Pendientes</p>
              <p className="text-2xl font-bold text-warning-600 mt-1">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-warning-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-5 border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">En Preparación</p>
              <p className="text-2xl font-bold text-brand-600 mt-1">{preparingCount}</p>
            </div>
            <ChefHat className="h-8 w-8 text-brand-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-5 border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Listos para Entregar</p>
              <p className="text-2xl font-bold text-success-600 mt-1">{readyCount}</p>
            </div>
            <Package className="h-8 w-8 text-success-500" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'preparing', 'ready'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === f ? 'bg-brand-500 text-white shadow-soft' : 'bg-white text-ink-light border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'preparing' ? 'En Cocina' : 'Listos'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-ink">Pedidos Activos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Pedido</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Items</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-ink text-sm">{order.number}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-neutral-400" />
                      <span className="text-sm text-ink">{order.clientName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm text-neutral-500">
                      {order.type === 'delivery' ? <Bike className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      {order.type === 'delivery' ? 'Delivery' : 'Local'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-neutral-500">{order.items}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-ink">{formatPrice(order.total)}</td>
                  <td className="py-3 px-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status] || 'badge-neutral'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn-secondary btn-sm"
                      >
                        Ver
                      </button>
                      {['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status) && (
                        <button
                          onClick={() => advanceOrder(order.id)}
                          className="btn-primary btn-sm"
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
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
                <Package className="h-8 w-8 text-neutral-300" />
              </div>
              <p className="text-neutral-500 font-medium">No hay pedidos en esta categoría</p>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-popover animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-ink">{selectedOrder.number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-ink transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-0 divide-y divide-neutral-100 text-sm">
              <div className="flex justify-between py-3">
                <span className="text-neutral-500">Cliente</span>
                <span className="font-medium text-ink">{selectedOrder.clientName}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500">Teléfono</span>
                <span className="font-medium text-ink flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-neutral-400" /> {selectedOrder.clientPhone}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500">Tipo</span>
                <span className="font-medium text-ink flex items-center gap-1">
                  {selectedOrder.type === 'delivery' ? <Bike className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {selectedOrder.type === 'delivery' ? 'Delivery' : 'Local'}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500">Dirección</span>
                <span className="font-medium text-ink text-right max-w-[180px]">{selectedOrder.address}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500">Items</span>
                <span className="font-medium text-ink">{selectedOrder.items}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500">Total</span>
                <span className="font-bold text-ink text-base">{formatPrice(selectedOrder.total)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500">Pago</span>
                <span className="font-medium text-ink flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-neutral-400" /> {selectedOrder.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500">Estado</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[selectedOrder.status] || 'badge-neutral'}`}>
                  {statusLabels[selectedOrder.status] || selectedOrder.status}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {['PENDING', 'CONFIRMED', 'PREPARING'].includes(selectedOrder.status) && (
                <button
                  onClick={() => { advanceOrder(selectedOrder.id); setSelectedOrder(null); }}
                  className="btn-primary btn-md w-full"
                >
                  {selectedOrder.status === 'PENDING' ? 'Confirmar Pedido' :
                   selectedOrder.status === 'CONFIRMED' ? 'Iniciar Preparación' : 'Marcar como Listo'}
                </button>
              )}

              {selectedOrder.status === 'READY' && selectedOrder.type === 'delivery' && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-medium">Asignar repartidor disponible:</p>
                  {riders.filter((r) => r.status === 'available').map((rider) => (
                    <button
                      key={rider.id}
                      onClick={() => assignRider(selectedOrder.id, rider.id)}
                      className="btn-primary btn-md w-full mb-2"
                    >
                      <Bike className="h-4 w-4" /> {rider.name}
                    </button>
                  ))}
                  {riders.filter((r) => r.status === 'available').length === 0 && (
                    <p className="text-xs text-neutral-400 text-center">No hay repartidores disponibles</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}