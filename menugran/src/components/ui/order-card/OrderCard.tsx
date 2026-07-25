import { OrderTimeIndicator } from '@/components/ui/order-time-indicator/OrderTimeIndicator';

export const OrderCard = ({ order }) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-100 hover:shadow-lg transition-shadow duration-300">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-ink-dark mb-1">
              Pedido \#{order.id.slice(0, 8)}
            </h3>
            <p className="text-sm text-neutral-500">
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <OrderTimeIndicator
              estimatedMinutes={order.estimatedMinutes || 25}
              status={order.status as any}
              elapsedMinutes={order.elapsedMinutes}
              size="md"
              showLabel={true}
            />
          </div>
        </div>

        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm text-neutral-600">
              <span className="flex-shrink-0">•</span>
              <span className="flex-1">
                {item.quantity}x {item.name}
                {item.notes && (
                  <span className="font-italic text-neutral-400 ml-1">({item.notes})</span>
                )}
              </span>
              <span className="text-neutral-500">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-100">
          <div className="flex justify-between items-center text-base font-medium">
            <span>Total:</span>
            <span className="font-display text-brand-600">${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
