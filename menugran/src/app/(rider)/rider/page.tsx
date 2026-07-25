'use client';

import { useState } from 'react';
import { MapPin, Package, Bike, Clock, User, Phone, CheckCircle } from 'lucide-react';

const availableOrders = [
  { id: '1', number: '#001', restaurant: 'La Parrilla de Juan', pickupAddress: 'Av. Principal, CC Plaza Mayor', deliveryAddress: 'Calle 72 #10-34', distance: '2.5 km', total: 45000, clientName: 'Juan Perez', clientPhone: '04121111111', items: 3 },
  { id: '2', number: '#002', restaurant: 'Arepas Dona Rosa', pickupAddress: 'Calle 72 #10-34, Maracaibo', deliveryAddress: 'Av. Libertador', distance: '1.8 km', total: 35000, clientName: 'Ana Garcia', clientPhone: '04122222222', items: 2 },
  { id: '3', number: '#003', restaurant: 'Sushi Express', pickupAddress: 'Av. Libertador, CC Sambil', deliveryAddress: 'Carrera 15 #8-20', distance: '3.2 km', total: 62000, clientName: 'Carlos Lopez', clientPhone: '04123333333', items: 4 },
];

const todayDeliveries = [
  { id: 'd1', number: '#010', client: 'Maria Diaz', total: 28000, time: '10:30 AM', status: 'Entregado' },
  { id: 'd2', number: '#011', client: 'Pedro Ramos', total: 55000, time: '12:15 PM', status: 'Entregado' },
  { id: 'd3', number: '#012', client: 'Rosa Martinez', total: 32000, time: '2:00 PM', status: 'Entregado' },
];

const formatPrice = (v: number) => '$' + v.toLocaleString('es-CO');

export default function RiderPage() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [orders, setOrders] = useState(availableOrders);
  const [selectedOrder, setSelectedOrder] = useState<typeof availableOrders[0] | null>(null);
  const [myDeliveries, setMyDeliveries] = useState(todayDeliveries);

  const handleAcceptOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setMyDeliveries((prev) => [
        {
          id: order.id,
          number: order.number,
          client: order.clientName,
          total: order.total,
          time: 'Ahora',
          status: 'En camino',
        },
        ...prev,
      ]);
      setSelectedOrder(null);
    }
  };

  return (
    <div>
      {/* Toggle Disponibilidad */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Estado</h2>
            <p className="text-sm text-gray-500">
              {isAvailable ? 'Estas disponible para recibir pedidos' : 'No estas disponible'}
            </p>
          </div>
          <button
            onClick={() => setIsAvailable(!isAvailable)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isAvailable ? 'bg-green-500' : 'bg-gray-300'
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

      {/* Pedidos Disponibles */}
      {isAvailable && (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Pedidos disponibles</h3>
          {orders.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
              <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay pedidos disponibles</p>
              <p className="text-sm text-gray-400 mt-1">Vuelve a intentar en unos minutos</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-gray-300 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900">{order.number}</span>
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {order.distance}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{order.restaurant}</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{order.deliveryAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{order.items} items</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptOrder(order.id);
                      }}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-full text-xs font-medium hover:bg-red-700 transition"
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
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Mis entregas de hoy</h3>
      {myDeliveries.length === 0 ? (
        <div className="text-center py-6 bg-white rounded-xl border border-gray-100">
          <Bike className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">Aun no has hecho entregas hoy</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myDeliveries.map((delivery) => (
            <div key={delivery.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{delivery.number}</span>
                    <span className="text-xs text-gray-400">{delivery.time}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{delivery.client}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatPrice(delivery.total)}</p>
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {delivery.status}
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
              <h2 className="text-lg font-bold text-gray-900">{selectedOrder.number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 text-lg">×</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Package className="h-4 w-4" />
                <div>
                  <p className="text-xs text-gray-400">Recoger en</p>
                  <p className="font-medium">{selectedOrder.restaurant}</p>
                  <p className="text-xs text-gray-400">{selectedOrder.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <div>
                  <p className="text-xs text-gray-400">Entregar en</p>
                  <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4" />
                <div>
                  <p className="font-medium">{selectedOrder.clientName}</p>
                  <p className="text-xs text-gray-400">{selectedOrder.clientPhone}</p>
                </div>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{selectedOrder.items}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Distancia</span>
                <span className="font-medium">{selectedOrder.distance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-base">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            <button
              onClick={() => handleAcceptOrder(selectedOrder.id)}
              className="w-full mt-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              Aceptar Entrega
            </button>
          </div>
        </div>
      )}
    </div>
  );
}