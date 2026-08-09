import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import type { ProductRow } from '../../types/database';
import { useCart } from '../../hooks/useCart';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../../types/cart';

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const {
    items,
    totalAmount,
    totalItems,
    merchantId,
    validationError,
    canCheckout,
    clearCart,
  } = useCart();
  const navigate = useNavigate();

  if (!isOpen && items.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden={!isOpen}
      className="fixed inset-0 z-50 flex"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/30 transition-opacity"
        aria-label="Cerrar carrito"
      />

      <aside
        aria-label="Carrito de compras"
        className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-xl animate-in slide-in-from-right"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Tu carrito</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {validationError !== null ? (
            <div className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">{validationError}</p>
              <button
                type="button"
                onClick={clearCart}
                className="mt-2 rounded border border-red-600 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
              >
                Vaciar carrito
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 bg-gray-50">
              <ShoppingCart className="h-12 w-12 text-gray-300" />
              <p className="text-sm text-gray-500">Tu carrito está vacío</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => {
                const price = parseFloat(item.product.price);
                const lineTotal = price * item.quantity;
                return (
                  <li key={item.product.id} className="flex gap-3 p-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          Sin foto
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.product.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatPrice(lineTotal)} ({item.quantity} × {formatPrice(item.product.price)})
                      </p>
                      {item.notes ? (
                        <p className="mt-1 text-xs text-gray-600 italic">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Reducir cantidad de ${item.product.title}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <span className="text-sm font-medium text-gray-900">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
                        aria-label={`Aumentar cantidad de ${item.product.title}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label={`Eliminar ${item.product.title}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        <footer className="sticky bottom-0 border-t border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal ({totalItems} ítems):</span>
            <span className="font-bold text-gray-900">{formatPrice(totalAmount)}</span>
          </div>

          {validationError !== null && items.length > 0 ? (
            <div className="mt-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              <p className="font-medium">Cambio de comercio requerido</p>
              <p className="text-xs">
                Vacía el carrito para agregar productos de otro comercio.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canCheckout}
            onClick={() => {
              navigate('/checkout');
              onClose();
            }}
            className={`mt-3 w-full justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Proceder al pago
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </footer>
      </aside>
    </div>
  );
}