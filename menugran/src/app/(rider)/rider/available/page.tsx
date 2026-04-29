'use client';

import { useEffect, useState, useRef } from 'react';
import { MapPin, Home, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface AvailableOrder {
  id: string;
  restaurant: string;
  pickup: string;
  delivery: string;
  distance: string;
  total: number;
  items: Array<{ name: string; qty: number; price: number }>;
}

const sampleOrders: AvailableOrder[] = [
  {
    id: 'A-102',
    restaurant: 'La Casa del Sabor',
    pickup: 'Av. Central 123',
    delivery: 'Calle Luna 45',
    distance: '4.2 km',
    total: 28.50,
    items: [
      { name: 'Pollo a la brasa', qty: 1, price: 16.0 },
      { name: 'Chicha morada', qty: 1, price: 4.5 },
      { name: 'Arroz chaufa', qty: 1, price: 8.0 },
    ],
  },
  {
    id: 'A-107',
    restaurant: 'Sushi Express',
    pickup: 'Calle del Mar 89',
    delivery: 'Plaza Mayor 7',
    distance: '6.1 km',
    total: 34.20,
    items: [
      { name: 'Combo sushi 12 piezas', qty: 1, price: 24.0 },
      { name: 'Sopa miso', qty: 1, price: 3.5 },
      { name: 'Ginger', qty: 1, price: 0.70 },
      { name: 'Soja', qty: 1, price: 0.50 },
    ],
  },
  {
    id: 'A-113',
    restaurant: 'Burger Factory',
    pickup: 'Av. Roosevelt 210',
    delivery: 'Jardines del Sol 14',
    distance: '2.8 km',
    total: 22.80,
    items: [
      { name: 'Burger doble', qty: 1, price: 14.0 },
      { name: 'Papas rústicas', qty: 1, price: 4.5 },
      { name: 'Refresco', qty: 1, price: 4.3 },
    ],
  },
];

export default function RiderAvailableOrdersPage() {
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullHint, setPullHint] = useState('');
  const [available] = useState(true);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 900));
      setOrders(sampleOrders);
    } catch (err) {
      setError('Error al cargar los pedidos disponibles');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullHint('');
    }
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div
        className="min-h-screen"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Pedidos disponibles</p>
              <h1 className="text-lg font-semibold text-gray-900">Pedidos disponibles para entrega</h1>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
          {pullHint && <p className="mt-3 text-sm text-gray-500">{pullHint}</p>}
        </div>

        {!available ? (
          <div className="px-4 py-10 text-center text-gray-600">Esta pantalla solo está disponible cuando estás activo.</div>
        ) : loading ? (
          <div className="px-4 py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando pedidos...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-20 text-center text-red-600">
            <p className="font-semibold">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <p className="text-2xl font-semibold text-gray-900">No hay pedidos disponibles 🎉</p>
            <p className="mt-3 text-gray-600">Vuelve a intentar en unos minutos</p>
          </div>
        ) : (
          <div className="space-y-4 px-4 py-5">
            {orders.map(order => (
              <div key={order.id} className="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(prev => (prev === order.id ? null : order.id))}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{order.restaurant}</p>
                      <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {order.pickup}
                      </p>
                      <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        {order.delivery}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{order.distance}</p>
                    </div>
                  </div>
                </button>

                {expandedId === order.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-900">Detalles del pedido</p>
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm text-gray-700">
                          <span>{item.qty} x {item.name}</span>
                          <span>${(item.qty * item.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="text-lg font-semibold text-gray-900">${order.total.toFixed(2)}</span>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                    >
                      Aceptar Entrega
                    </button>
                    <div className="flex items-center text-sm text-gray-500 gap-2">
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
