'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Package, Bike, User, Phone, CheckCircle } from 'lucide-react';
import { asAppSession } from '@/lib/session-helpers';

interface ApiOrder {
  id: string;
  number: string;
  status: string;
  total: number;
  serviceType: string;
  address: string;
  deliveryAddress: string;
  createdAt: string;
  client: { id: string; name: string; phone: string } | null;
  restaurant: { id: string; name: string; address: string; phone: string } | null;
  items: { id?: string; quantity: number; price: number; menuItem: { name: string } }[];
  distance?: string;
}

const formatPrice = (v: number) => '$' + v.toLocaleString('es-CO');
const shortId = (id: string) => id.slice(-6);
const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    PREPARING: 'En cocina',
    READY: 'Listo',
    DELIVERING: 'En camino',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
  };
  return labels[status] ?? status;
};

export default function RiderPage() {
  const { data: rawSession } = useSession();
  const session = asAppSession(rawSession);
  const riderId = session?.user?.id ?? null;
  const [isAvailable, setIsAvailable] = useState(true);
  const [availableOrders, setAvailableOrders] = useState<ApiOrder[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<ApiOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  const fetchAvailable = useCallback(async () => {
    try {
      const res = await fetch('/api/rider/orders?view=available');
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
          fetch(`/api/rider/orders?status=DELIVERING`),
          fetch(`/api/rider/orders?status=DELIVERED`),
        ]);
        const deliveringData = await deliveringRes.json();
        const deliveredData = await deliveredRes.json();
        setMyDeliveries([
          ...(deliveringData.orders || []),
          ...(deliveredData.orders || []),
        ]);
      } catch {}
    };
    fetchDeliveries();
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
    } catch {
      // Ignored: order acceptance failed silently
    }
  };

  return (
    <div>
      {/* Toggle Disponibilidad */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-neutral-100 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink">Estado</h2>
            <p className="text-sm text-ink-lighter">
              {isAvailable ? 'Estas disponible para recibir pedidos' : 'No estas disponible'}
            </p>
          </div>
          <button
            onClick={() => setIsAvailable(!isAvailable)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsAvailable(!isAvailable); } }}
            className={`relative w-14 h-7 rounded-full transition-colors ${isAvailable ? 'bg-success-500' : 'bg-neutral-300'}`}
            role="switch"
            aria-checked={isAvailable}
            aria-label={isAvailable ? 'Disponible - clic para cambiar a no disponible' : 'No disponible - clic para cambiar a disponible'}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                isAvailable ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Pedidos Disponibles */}
      {isAvailable && (
        <>
          <h3 className="text-lg font-semibold text-ink mb-3">Pedidos disponibles</h3>
          {availableOrders.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-neutral-100">
              <Package className="h-10 w-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-ink-lighter">No hay pedidos disponibles</p>
              <p className="text-sm text-neutral-400 mt-1">Vuelve a intentar en unos minutos</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {availableOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOrder(order); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver pedido ${shortId(order.id)} de ${order.restaurant?.name ?? 'Restaurante'}`}
                  className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4 cursor-pointer hover:border-brand-300 transition focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-ink">{order.number}</span>
                    <span className="text-sm text-neutral-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {order.distance}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-ink-lighter mb-2">
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{order.restaurant?.name ?? 'Restaurante'}</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{order.deliveryAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                      <span>{order.items.length} items</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptOrder(order.id);
                      }}
                      className="px-4 py-1.5 bg-brand-600 text-white rounded-full text-xs font-medium hover:bg-brand-700 transition"
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

      {/* Historial del Dia */}
      <h3 className="text-lg font-semibold text-ink mb-3">Mis entregas de hoy</h3>
      {myDeliveries.length === 0 ? (
        <div className="text-center py-6 bg-white rounded-xl border border-neutral-100">
          <Bike className="h-10 w-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-ink-lighter">Aun no has hecho entregas hoy</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4"
              role="article"
              aria-label={`Entrega ${shortId(delivery.id)} - ${statusLabel(delivery.status)}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-sm">{delivery.number}</span>
                    <span className="text-xs text-neutral-400">{new Date(delivery.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-ink-lighter mt-1">{delivery.client?.name ?? 'Cliente'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">{formatPrice(delivery.total)}</p>
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {statusLabel(delivery.status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalle */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">{selectedOrder.number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-neutral-400 text-lg">×</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-ink-lighter">
                <Package className="h-4 w-4" />
                <div>
                  <p className="text-xs text-neutral-400">Recoger en</p>
                  <p className="font-medium">{selectedOrder.restaurant?.name ?? 'Restaurante'}</p>
                  <p className="text-xs text-neutral-400">{selectedOrder.restaurant?.address ?? ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-ink-lighter">
                <MapPin className="h-4 w-4" />
                <div>
                  <p className="text-xs text-neutral-400">Entregar en</p>
                  <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-ink-lighter">
                <User className="h-4 w-4" />
                <div>
                  <p className="font-medium">{selectedOrder.client?.name ?? 'Cliente'}</p>
                  <p className="text-xs text-neutral-400">{selectedOrder.client?.phone ?? ''}</p>
                </div>
              </div>
              <div className="flex justify-between pt-3 border-t border-neutral-100">
                <span className="text-ink-lighter">Items</span>
                <span className="font-medium">{selectedOrder.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-lighter">Distancia</span>
                <span className="font-medium">{selectedOrder.distance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-lighter">Total</span>
                <span className="font-bold text-base">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            <button
              onClick={() => handleAcceptOrder(selectedOrder.id)}
              className="w-full mt-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
            >
              Aceptar Entrega
            </button>
          </div>
        </div>
      )}
    </div>
  );
}