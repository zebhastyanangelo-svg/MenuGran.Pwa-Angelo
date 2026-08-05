'use client';

import { useState } from 'react';
import { useCartStore, selectTotal } from '@/modules/cart/store';
import { useSession } from 'next-auth/react';
import { asAppSession } from '@/lib/session-helpers';
import GeolocationButton from '@/components/geolocation/GeolocationButton';
import Button from '@/components/ui/Button';

export default function CheckoutPage() {
  const { data: rawSession } = useSession();
  const session = asAppSession(rawSession);
  const userId = session?.user.id;

  const items = useCartStore((state) => state.items);
  const total = useCartStore(selectTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const [serviceType, setServiceType] = useState<'MESA' | 'DELIVERY'>('MESA');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_PAYMENT'>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLocationSelect = (selectedLat: number, selectedLng: number, address?: string) => {
    setLat(selectedLat);
    setLng(selectedLng);
    if (address) {
      setDeliveryAddress(address);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      setError('Debes iniciar sesión para realizar un pedido');
      return;
    }

    if (!items.length) {
      setError('El carrito está vacío');
      return;
    }

    if (serviceType === 'MESA' && !tableNumber) {
      setError('Número de mesa requerido');
      return;
    }

    if (serviceType === 'DELIVERY' && !deliveryAddress) {
      setError('Dirección de entrega requerida');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload = {
      restaurantId: items[0]?.restaurantId,
      items: items.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity,
      })),
      serviceType,
      tableNumber: serviceType === 'MESA' ? parseInt(tableNumber) || undefined : undefined,
      deliveryAddress: serviceType === 'DELIVERY' ? deliveryAddress : undefined,
      lat: serviceType === 'DELIVERY' ? lat : undefined,
      lng: serviceType === 'DELIVERY' ? lng : undefined,
      paymentMethod,
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        clearCart();
        window.location.href = `/order-status/${data.data.id}`;
      } else {
        setError(data.error || 'Error al crear el pedido');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-ink">Checkout</h1>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-soft border border-neutral-200">
            <h2 className="text-lg font-semibold text-ink mb-4">Método de servicio</h2>
            <div className="flex gap-3">
              <Button
                variant={serviceType === 'MESA' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setServiceType('MESA')}
                className="flex-1"
              >
                En mesa
              </Button>
              <Button
                variant={serviceType === 'DELIVERY' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setServiceType('DELIVERY')}
                className="flex-1"
              >
                Delivery
              </Button>
            </div>
          </div>

          {serviceType === 'MESA' ? (
            <div className="rounded-2xl bg-white p-6 shadow-soft border border-neutral-200">
              <h2 className="text-lg font-semibold text-ink mb-4">Información de mesa</h2>
              <div>
                <label htmlFor="tableNumber" className="block text-sm font-medium text-neutral-700 mb-2">
                  Número de mesa
                </label>
                <input
                  id="tableNumber"
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Ej: 5"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow-soft border border-neutral-200">
              <h2 className="text-lg font-semibold text-ink mb-4">Dirección de entrega</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="deliveryAddress" className="block text-sm font-medium text-neutral-700 mb-2">
                    Dirección
                  </label>
                  <input
                    id="deliveryAddress"
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Ingresa la dirección manualmente"
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                <GeolocationButton
                  onLocationSelect={handleLocationSelect}
                  isLoading={isSubmitting}
                  className="w-full"
                />

                {(lat && lng) && (
                  <div className="rounded-lg bg-brand-50 border border-brand-200 p-4">
                    <div className="flex items-center gap-2 text-sm text-brand-700">
                      <span>📍</span>
                      <span>Ubicación detectada: Lat {lat.toFixed(6)}, Lng {lng.toFixed(6)}</span>
                    </div>
                    {deliveryAddress && (
                      <div className="mt-2 text-sm text-neutral-600">
                        <span>Dirección: {deliveryAddress}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-soft border border-neutral-200">
            <h2 className="text-lg font-semibold text-ink mb-4">Método de pago</h2>
            <div className="flex gap-3">
              <Button
                variant={paymentMethod === 'CASH' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setPaymentMethod('CASH')}
                className="flex-1"
              >
                Efectivo
              </Button>
              <Button
                variant={paymentMethod === 'MOBILE_PAYMENT' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setPaymentMethod('MOBILE_PAYMENT')}
                className="flex-1"
              >
                Pago Móvil
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4">
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Procesando...' : 'Realizar pedido'}
          </Button>
        </div>
      </div>
    </div>
  );
}
