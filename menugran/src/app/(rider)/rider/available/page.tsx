'use client';

import { useEffect, useState, useRef } from 'react';
import { MapPin, Home, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface AvailableOrder {
  id: string;
  restaurant: string;
  pickup: string;
  delivery: string;
  total: number;
  items: OrderItem[];
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function RiderAvailableOrdersPage() {
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pullHint, setPullHint] = useState('');
  const [available] = useState(true);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/rider/orders?view=available');
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      const mapped: AvailableOrder[] = (data.orders || []).map((o: any) => ({
        id: o.id,
        restaurant: o.restaurant.name,
        pickup: o.restaurant.address,
        delivery: o.deliveryAddress || 'No especificada',
        total: o.totalPrice,
        items: o.items.map((i: any) => ({
          name: i.menuItem.name,
          qty: i.quantity,
          price: i.price,
        })),
      }));
      setOrders(mapped);
    } catch (err) {
      setError('Error al cargar los pedidos disponibles');
    } finally {
      setLoading(false);
      setPullHint('');
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    await fetchOrders();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY > 0) return;
    touchStartY.current = event.touches[0].clientY;
    touchCurrentY.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY > 0) return;
    touchCurrentY.current = event.touches[0].clientY;
    const distance = touchCurrentY.current - touchStartY.current;
    if (distance > 50) {
      setPullHint('Suelta para actualizar');
    } else if (distance > 0) {
      setPullHint('Desliza hacia abajo para actualizar');
    }
  };

  const handleTouchEnd = async () => {
    const distance = touchCurrentY.current - touchStartY.current;
    if (distance > 80) {
      await handleRefresh();
    }
    setPullHint('');
  };

  return (
    <div className="min-h-screen bg-cream-50 text-ink animate-fade-in">
      <div
        className="min-h-screen"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-white border-b border-neutral-200 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Pedidos disponibles</p>
              <h1 className="text-lg font-semibold text-ink">Pedidos disponibles para entrega</h1>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-primary btn-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
          {pullHint && <p className="mt-3 text-sm text-neutral-500">{pullHint}</p>}
        </div>

        {!available ? (
          <div className="px-4 py-10 text-center text-ink-light">Esta pantalla solo esta disponible cuando estas activo.</div>
        ) : loading ? (
          <div className="px-4 py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
            <p className="mt-4 text-neutral-500">Cargando pedidos...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-20 text-center text-brand-500">
            <p className="font-semibold">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <p className="text-2xl font-semibold text-ink">No hay pedidos disponibles</p>
            <p className="mt-3 text-ink-light">Vuelve a intentar en unos minutos</p>
          </div>
        ) : (
          <div className="space-y-4 px-4 py-5">
            {orders.map(order => (
              <div key={order.id} className="rounded-xl bg-white border border-neutral-200 shadow-soft overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(prev => (prev === order.id ? null : order.id))}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">{order.restaurant}</p>
                      <p className="mt-2 text-sm text-ink-light flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {order.pickup}
                      </p>
                      <p className="mt-2 text-sm text-ink-light flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        {order.delivery}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-ink">{formatPrice(order.total)}</p>
                    </div>
                  </div>
                </button>

                {expandedId === order.id && (
                  <div className="border-t border-neutral-200 bg-neutral-50 p-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink">Detalles del pedido</p>
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm text-ink-light">
                          <span>{item.qty} x {item.name}</span>
                          <span>{formatPrice(item.qty * item.price)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-light">Total</span>
                      <span className="text-lg font-semibold text-ink">{formatPrice(order.total)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-primary btn-md w-full"
                    >
                      Aceptar Entrega
                    </button>
                    <div className="flex items-center text-sm text-neutral-500 gap-2">
                      {expandedId === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>Ver menos detalles</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
