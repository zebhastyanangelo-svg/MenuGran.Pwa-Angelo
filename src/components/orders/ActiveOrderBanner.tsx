import { useNavigate } from 'react-router-dom';
import { useActiveOrder } from '../../hooks/useActiveOrder';
import { getOrderStatusLabel } from '../../utils/orderStatus';
import { Bike, Store } from 'lucide-react';

export function ActiveOrderBanner() {
  const { isActive, order, status } = useActiveOrder();
  const navigate = useNavigate();

  if (!isActive || !order || !status) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-brand-red text-white shadow-lg"
      role="alert"
    >
      <div className="mx-auto max-w-5xl px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {order.type === 'delivery' ? (
              <Bike className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Store className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="text-sm font-medium">
              Pedido #{order.id.slice(0, 8).toUpperCase()} —{' '}
              {getOrderStatusLabel(status)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/orders/${order.id}`)}
            className="whitespace-nowrap rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
          >
            Ver seguimiento
          </button>
        </div>
      </div>
    </div>
  );
}