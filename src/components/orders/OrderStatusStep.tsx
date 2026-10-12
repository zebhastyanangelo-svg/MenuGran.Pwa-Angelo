import type { OrderStatus } from '../../types/database';
import { getOrderStatusLabel } from '../../utils/orderStatus';

interface OrderStatusStepProps {
  status: OrderStatus;
  currentIndex: number;
  index: number;
  isCompleted: boolean;
  /** Etiqueta opcional (p. ej. "Listo para Retirar" en pedidos pickup). */
  label?: string;
}

const STATUS_ANIMATIONS: Record<OrderStatus, string> = {
  payment_pending: 'animate-spin',
  confirmed: 'animate-bounce',
  preparing: 'animate-spin',
  ready: 'animate-bounce',
  on_the_way: 'animate-pulse',
  delivered: '',
  cancelled: '',
};

function StatusIcon({ status, index, currentIndex, isCompleted }: { status: OrderStatus; index: number; currentIndex: number; isCompleted: boolean }) {
  const isActive = index === currentIndex && !isCompleted;
  const isPast = index < currentIndex;
  const isFuture = index > currentIndex;

  if (isPast) {
    return <i className="fa-solid fa-circle-check text-emerald-500" aria-hidden="true" />;
  }

  if (isFuture) {
    return <i className="fa-regular fa-circle text-gray-300" aria-hidden="true" />;
  }

  const animation = STATUS_ANIMATIONS[status] || '';

  const statusIcons: Record<OrderStatus, React.ReactNode> = {
    payment_pending: <i className={`fa-solid fa-clock text-amber-500 ${animation}`} aria-hidden="true" />,
    confirmed: <i className={`fa-solid fa-circle-check text-blue-500 ${animation}`} aria-hidden="true" />,
    preparing: <i className={`fa-solid fa-utensils text-indigo-500 ${animation}`} aria-hidden="true" />,
    ready: <i className={`fa-solid fa-circle-check text-green-500 ${animation}`} aria-hidden="true" />,
    on_the_way: <i className={`fa-solid fa-truck text-purple-500 ${animation}`} aria-hidden="true" />,
    delivered: <i className="fa-solid fa-circle-check text-emerald-500" aria-hidden="true" />,
    cancelled: <i className="fa-solid fa-circle-xmark text-red-500" aria-hidden="true" />,
  };

  return (
    <div className="relative flex items-center justify-center">
      {statusIcons[status]}
      {isActive && (
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-100 opacity-75" />
      )}
    </div>
  );
}

export function OrderStatusStep({ status, currentIndex, index, isCompleted, label }: OrderStatusStepProps) {
  const isActive = index === currentIndex && !isCompleted;
  const isPast = index < currentIndex;

  const containerClass = isActive
    ? 'flex flex-col items-center cursor-pointer'
    : 'flex flex-col items-center';

  const circleClass = isPast
    ? 'relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50'
    : isActive
      ? 'relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
      : 'relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-50';

  const labelClass = isPast
    ? 'mt-2 text-xs font-medium text-emerald-600'
    : isActive
      ? 'mt-2 text-xs font-medium text-blue-600'
      : 'mt-2 text-xs font-medium text-gray-400';

  return (
    <div className={containerClass}>
      <div className={circleClass}>
        <StatusIcon status={status} index={index} currentIndex={currentIndex} isCompleted={isCompleted} />
      </div>
      <span className={labelClass}>
        {label ?? getOrderStatusLabel(status)}
      </span>
    </div>
  );
}