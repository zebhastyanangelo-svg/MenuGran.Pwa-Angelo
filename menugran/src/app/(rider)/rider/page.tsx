'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Package, Bike, User, Phone, CheckCircle } from 'lucide-react';

interface ApiOrder {
  id: string;
  totalPrice: number;
  deliveryAddress: string | null;
  createdAt: string;
  status: string;
  restaurant: { id: string; name: string; address: string; phone?: string };
  client: { id: string; name: string; phone: string };
  items: Array<{ menuItem: { name: string }; quantity: number; price: number }>;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

function shortId(id: string) {
  return '#' + id.slice(-4).toUpperCase();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string) {
  switch (status) {
    case 'DELIVERING': return 'En camino';
    case 'DELIVERED': return 'Entregado';
    default: return status;
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'DELIVERING': return 'text-brand-600';
    case 'DELIVERED': return 'text-success-600';
    default: return 'text-neutral-600';
  }
}

export default function RiderPage() {
  const { data: session } = useSession();
  const riderId = session?.user?.id ?? null;
  const [isAvailable, setIsAvailable] = useState(true);
  const [availableOrders, setAvailableOrders] = useState<ApiOrder[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<ApiOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  const fetchAvailable = useCallback(async () => {
    try {
      const res = await fetch('/api/rider/orders');
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data.orders || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAvailable();
  }, [fetchAvailable]);

  useEffect(() => {
    if (!riderId) return;
    const fetchDeliveries = async () => {
      if (!riderId) return;
      try {
        const [deliveringRes, deliveredRes] = await Promise.all([
          fetch(`/api/rider/orders?riderId=${riderId}&status=DELIVERING`),
          fetch(`/api/rider/orders?riderId=${riderId}&status=DELIVERED`),
        ]);
        const deliveringData = await deliveringRes.json();
        const deliveredData = await deliveredRes.json();
        setMyDeliveries([
          ...(deliveringData.orders || []),
          ...(deliveredData.orders || []),
        ]);
      } catch {}
    };
    if (riderId) fetchDeliveries();
  }, [riderId]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!riderId) return;
    try {
      const res = await fetch(`/api/rider/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', riderId }),
      });
      if (res.ok) {
        const order = availableOrders.find((o) => o.id === orderId);
        setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
        if (order) {
          setMyDeliveries((prev) => [{ ...order, status: 'DELIVERING' }, ...prev]);
        }
        setSelectedOrder(null);
      }
    } catch {}
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-xl shadow-soft p-4 border border-neutral-200 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink">Estado</h2>
            <p className="text-sm text-neutral-500">
              {isAvailable ? 'Estas disponible para recibir pedidos' : 'No estas disponible'}
            </p>
          </div>
          <button
            onClick={() => setIsAvailable(!isAvailable)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isAvailable ? 'bg-success-500' : 'bg-neutral-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                isAvailable ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {isAvailable && (
        <>
          <h3 className="text-lg font-semibold text-ink mb-3">Pedidos disponibles</h3>
          {availableOrders.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-neutral-200">
              <Package className="h-10 w-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-neutral-500">No hay pedidos disponibles</p>
              <p className="text-sm text-neutral-400 mt-1">Vuelve a intentar en unos minutos</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {availableOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4 cursor-pointer hover:border-brand-300 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-ink">{shortId(order.id)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-500 mb-2">
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{order.restaurant.name}</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{order.deliveryAddress || order.restaurant.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                      <span>{order.items.length} items</span>
                      <span>{formatPrice(order.totalPrice)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptOrder(order.id);
                      }}
                      className="btn-primary btn-sm rounded-full"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <h3 className="text-lg font-semibold text-ink mb-3">Mis entregas de hoy</h3>
      {myDeliveries.length === 0 ? (
        <div className="text-center py-6 bg-white rounded-xl border border-neutral-200">
          <Bike className="h-10 w-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-neutral-500">Aun no has hecho entregas hoy</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myDeliveries.map((delivery) => (
            <div key={delivery.id} className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-sm">{shortId(delivery.id)}</span>
                    <span className="text-xs text-neutral-400">{formatTime(delivery.createdAt)}</span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{delivery.client.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">{formatPrice(delivery.totalPrice)}</p>
                  <span className={`text-xs flex items-center gap-1 ${statusColor(delivery.status)}`}>
                    <CheckCircle className="h-3 w-3" /> {statusLabel(delivery.status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">{shortId(selectedOrder.id)}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-neutral-400 text-lg hover:text-ink transition-colors">×</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-ink-light">
                <Package className="h-4 w-4" />
                <div>
                  <p className="text-xs text-neutral-400">Recoger en</p>
                  <p className="font-medium">{selectedOrder.restaurant.name}</p>
                  <p className="text-xs text-neutral-400">{selectedOrder.restaurant.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-ink-light">
                <MapPin className="h-4 w-4" />
                <div>
                  <p className="text-xs text-neutral-400">Entregar en</p>
                  <p className="font-medium">{selectedOrder.deliveryAddress || 'No especificada'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-ink-light">
                <User className="h-4 w-4" />
                <div>
                  <p className="font-medium">{selectedOrder.client.name}</p>
                  <p className="text-xs text-neutral-400">{selectedOrder.client.phone}</p>
                </div>
              </div>
              <div className="flex justify-between pt-3 border-t border-neutral-200">
                <span className="text-neutral-500">Items</span>
                <span className="font-medium">{selectedOrder.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Total</span>
                <span className="font-bold text-base">{formatPrice(selectedOrder.totalPrice)}</span>
              </div>
            </div>

            <button
              onClick={() => handleAcceptOrder(selectedOrder.id)}
              className="btn-primary btn-md w-full"
            >
              Aceptar Entrega
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
