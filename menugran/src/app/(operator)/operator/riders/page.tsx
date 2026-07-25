'use client';

import React, { useState, useEffect } from 'react';
import { User, Clock, CheckCircle, MapPin, Bike, X } from 'lucide-react';

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'delivering' | 'inactive';
  deliveredToday: number;
  avgDeliveryTime: number;
}

interface ReadyOrder {
  id: string;
  number: string;
  customer: { name: string; address: string };
  total: number;
  createdAt: string;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const formatTimeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'Hace segundos';
  return `Hace ${diff} min`;
};

export default function OperatorRidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'delivering'>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [selectedOrder, setSelectedOrder] = useState('');

  const fetchData = async () => {
    try {
      const [ridersRes, ordersRes] = await Promise.all([
        fetch('/api/operator/riders'),
        fetch('/api/operator/orders?status=READY'),
      ]);
      if (ridersRes.ok) {
        const ridersData = await ridersRes.json();
        setRiders(ridersData.data);
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const mapped: ReadyOrder[] = ordersData.data.map((o: Record<string, unknown>) => ({
          id: o.id as string,
          number: o.number as string,
          customer: {
            name: o.clientName as string,
            address: o.address as string,
          },
          total: o.total as number,
          createdAt: o.createdAt as string,
        }));
        setReadyOrders(mapped);
      }
    } catch (err) {
      console.error('Error fetching riders data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRiders = riders.filter((rider) => {
    if (filter === 'all') return true;
    if (filter === 'available') return rider.status === 'available';
    if (filter === 'delivering') return rider.status === 'delivering';
    return true;
  });

  const getStatusBadge = (status: Rider['status']) => {
    const badges: Record<string, string> = {
      available: 'badge-success',
      delivering: 'badge-brand',
      inactive: 'badge-neutral',
    };
    const labels: Record<string, string> = {
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

  const handleAssignOrder = async () => {
    if (!selectedRider || !selectedOrder) return;
    try {
      const res = await fetch(`/api/operator/orders/${selectedOrder}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERING', riderId: selectedRider.id }),
      });
      if (!res.ok) throw new Error('Failed to assign');
      setRiders((prev) =>
        prev.map((r) => (r.id === selectedRider.id ? { ...r, status: 'delivering' as const } : r))
      );
      setReadyOrders((prev) => prev.filter((o) => o.id !== selectedOrder));
      setShowAssignModal(false);
      setSelectedRider(null);
    } catch (err) {
      console.error('Error assigning order:', err);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-soft p-6 animate-pulse">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-neutral-200 rounded-full mr-3" />
              <div className="flex-1">
                <div className="h-4 bg-neutral-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-neutral-200 rounded w-1/3" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 rounded" />
              <div className="h-4 bg-neutral-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const availableCount = riders.filter((r) => r.status === 'available').length;
  const deliveringCount = riders.filter((r) => r.status === 'delivering').length;

  return (
    <div className="animate-fade-in">
        <div className="bg-white rounded-xl shadow-soft p-5 border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Total Repartidores</p>
              <p className="text-2xl font-bold text-ink mt-1">{riders.length}</p>
            </div>
            <Bike className="h-8 w-8 text-neutral-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-5 border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Disponibles</p>
              <p className="text-2xl font-bold text-success-600 mt-1">{availableCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-5 border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">En Entrega</p>
              <p className="text-2xl font-bold text-brand-600 mt-1">{deliveringCount}</p>
            </div>
            <Bike className="h-8 w-8 text-brand-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-5 border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Disponibles</p>
              <p className="text-2xl font-bold text-success-600 mt-1">{availableCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-5 border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">En Entrega</p>
              <p className="text-2xl font-bold text-brand-600 mt-1">{deliveringCount}</p>
            </div>
            <Bike className="h-8 w-8 text-brand-500" />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
         {(['all', 'available', 'delivering'] as const).map((f) => (
           <button
             key={f}
             onClick={() => setFilter(f)}
             className={`btn-sm ${
               filter === f ? 'btn-primary' : 'btn-secondary'
             }`}
           >
             {f === 'all' ? 'Todos' : f === 'available' ? 'Disponibles' : 'En entrega'}
           </button>
         ))}
       </div>

       {filteredRiders.length === 0 ? (
         <div className="text-center py-12">
           <User className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
           <p className="text-neutral-500">No hay repartidores en esta categoria</p>
         </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredRiders.map((rider) => (
             <div key={rider.id} className="bg-white rounded-xl shadow-soft border border-neutral-100 p-6">
               <div className="flex items-center mb-4">
                 <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                   <span className="text-brand-500 font-bold">{getInitials(rider.name)}</span>
                 </div>
                 <div className="flex-1">
                   <h3 className="font-semibold text-ink">{rider.name}</h3>
                   {getStatusBadge(rider.status)}
                 </div>
               </div>

               <div className="space-y-2 mb-4 text-sm">
                 <div className="flex justify-between">
                   <span className="text-neutral-500 flex items-center gap-1">
                     <CheckCircle className="w-4 h-4" /> Entregas hoy
                   </span>
                   <span className="font-medium">{rider.deliveredToday}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-neutral-500 flex items-center gap-1">
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
                   className="btn-primary btn-sm w-full"
                 >
                   Asignar pedido
                 </button>
               )}
             </div>
           ))}
         </div>
       )}

       {showAssignModal && selectedRider && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAssignModal(false)}>
           <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
             <div className="p-5">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-ink">
                   Asignar a {selectedRider.name}
                 </h3>
                 <button onClick={() => setShowAssignModal(false)} className="text-neutral-400 hover:text-neutral-600">
                   <X className="h-5 w-5" />
                 </button>
               </div>

               {readyOrders.length === 0 ? (
                 <p className="text-center text-neutral-500 py-6">No hay pedidos listos para entregar</p>
               ) : (
                 <div className="space-y-2 mb-4">
                   {readyOrders.map((order) => (
                     <div
                       key={order.id}
                       onClick={() => setSelectedOrder(order.id)}
                       className={`p-3 border rounded-lg cursor-pointer transition ${
                         selectedOrder === order.id ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 hover:border-neutral-300'
                       }`}
                     >
                       <div className="flex justify-between items-start">
                         <div>
                           <p className="font-medium text-ink">{order.number}</p>
                           <p className="text-sm text-neutral-600">{order.customer.name}</p>
                           <p className="text-xs text-neutral-500 flex items-center gap-1">
                             <MapPin className="w-3 h-3" /> {order.customer.address}
                           </p>
                         </div>
                         <div className="text-right">
                           <p className="font-medium text-ink">{formatPrice(order.total)}</p>
                           <p className="text-xs text-neutral-400">{formatTimeAgo(order.createdAt)}</p>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}

               <div className="flex gap-3">
                 <button
                   onClick={() => setShowAssignModal(false)}
                   className="btn-secondary btn-md flex-1"
                 >
                   Cancelar
                 </button>
                 <button
                   onClick={handleAssignOrder}
                   disabled={!selectedOrder || readyOrders.length === 0}
                   className="btn-primary btn-md flex-1"
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
