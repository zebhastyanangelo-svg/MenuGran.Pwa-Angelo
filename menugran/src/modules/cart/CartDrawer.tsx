'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartShopping, faXmark, faMoneyBillWave, faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import { useCartStore, selectTotal } from '@/modules/cart/store';
import ServiceTypeModal from '@/modules/cart/ServiceTypeModal';
import type { ServiceType } from '@/types';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_PAYMENT'>('CASH');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const items = useCartStore((state) => state.items);
  const total = useCartStore(selectTotal);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  const handleSubmit = (serviceData: { serviceType: ServiceType; tableNumber?: number; deliveryAddress?: string; lat?: number; lng?: number }) => {
    const restaurantId = items[0]?.restaurantId;
    if (!restaurantId || !userId) return;

    const payload = {
      clientId: userId,
      restaurantId,
      items: items.map((i) => ({
        menuItemId: i.id,
        quantity: i.quantity,
        price: i.price,
      })),
      paymentMethod,
      totalPrice: total,
      ...serviceData,
    };

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          clearCart();
          onClose();
          router.push('/client/orders');
        }
      })
      .catch(console.error);
  };

  return (
    <>
      <div className={`fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => onClose()}
        />
        <aside className={`absolute right-0 top-0 h-full w-full max-w-md transform bg-white shadow-popover transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Tu Pedido</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Resumen</h2>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              className="rounded-xl bg-neutral-100 p-2 text-ink-light transition hover:bg-neutral-200"
              aria-label="Cerrar carrito"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </div>

          <div className="flex h-full flex-col justify-between px-6 py-5">
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-ink-light">
                <div className="text-4xl text-neutral-300"><FontAwesomeIcon icon={faCartShopping} /></div>
                <p className="text-lg font-semibold text-ink">Tu carrito está vacío</p>
                <p className="max-w-xs text-sm text-neutral-500">Agrega platos y regresa cuando estés listo para pedir.</p>
                <Link
                  href="/client"
                  onClick={() => onClose()}
                  className="btn-primary btn-md"
                >
                  Ver restaurantes
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-4 overflow-y-auto pb-4">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-ink">{item.name}</p>
                          <p className="mt-1 text-sm text-neutral-500">{item.quantity} x ${item.price}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-100"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="rounded-full bg-neutral-100 px-3 py-2 text-ink-light transition hover:bg-neutral-200"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold text-ink">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="rounded-full bg-neutral-100 px-3 py-2 text-ink-light transition hover:bg-neutral-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    <span>Total</span>
                    <span className="font-semibold text-ink">${total.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Metodo de pago</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                        paymentMethod === 'CASH'
                          ? 'bg-brand-500 text-white shadow-soft'
                          : 'bg-white text-ink-light hover:bg-neutral-100'
                      }`}
                    >
                      <FontAwesomeIcon icon={faMoneyBillWave} className="h-4 w-4" />
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('MOBILE_PAYMENT')}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                        paymentMethod === 'MOBILE_PAYMENT'
                          ? 'bg-brand-500 text-white shadow-soft'
                          : 'bg-white text-ink-light hover:bg-neutral-100'
                      }`}
                    >
                      <FontAwesomeIcon icon={faMobileScreen} className="h-4 w-4" />
                      Pago Movil
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(true)}
                    className="btn-primary btn-md w-full"
                  >
                    Hacer Pedido
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      onClose();
                    }}
                    className="btn-secondary btn-md w-full"
                  >
                    Limpiar carrito
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <ServiceTypeModal
        open={showServiceModal}
        onSubmit={handleSubmit}
        onClose={() => setShowServiceModal(false)}
      />
    </>
  );
}
