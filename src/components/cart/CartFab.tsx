import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { CartDrawer } from './CartDrawer';

const AUTH_ROUTES = ['/login', '/register'];

export function CartFab() {
  const [isOpen, setIsOpen] = useState(false);
  const { totalItems } = useCart();
  const { profile } = useAuth();
  const { pathname } = useLocation();

  if (AUTH_ROUTES.includes(pathname)) {
    return null;
  }

  // El Super Admin no compra: sin carrito flotante.
  if (profile?.role === 'superadmin') {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir carrito de compras"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-white shadow-lg transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
      >
        <ShoppingCart className="h-6 w-6" aria-hidden="true" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-amber px-1.5 text-xs font-bold text-slate-900">
            {totalItems}
          </span>
        )}
      </button>

      <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
