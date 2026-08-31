import type { OrderStatus } from '../../types/database';
import { getOrderStatusLabel } from '../../utils/orderStatus';

interface OrderStatusStepProps {
  status: OrderStatus;
  currentIndex: number;
  index: number;
  isCompleted: boolean;
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
    return (
      <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    );
  }

  if (isFuture) {
    return (
      <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  const animation = STATUS_ANIMATIONS[status] || '';

  const statusPaths: Record<OrderStatus, React.ReactNode> = {
    payment_pending: (
      <svg className={`w-6 h-6 text-amber-500 ${animation}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 6v6l4 2" strokeLinecap="round" />
      </svg>
    ),
    confirmed: (
      <svg className={`w-6 h-6 text-blue-500 ${animation}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    preparing: (
      <svg className={`w-6 h-6 text-indigo-500 ${animation}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
    ),
    ready: (
      <svg className={`w-6 h-6 text-green-500 ${animation}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    on_the_way: (
      <svg className={`w-6 h-6 text-purple-500 ${animation}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M1 3h15v13H1zM16 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM22 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="5.5" cy="17.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="18.5" cy="17.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    delivered: (
      <svg className={`w-6 h-6 text-emerald-500 ${animation}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    cancelled: (
      <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 8l8 8M16 8l-8 8" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <div className="relative flex items-center justify-center">
      {statusPaths[status]}
      {isActive && (
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-100 opacity-75" />
      )}
    </div>
  );
}

export function OrderStatusStep({ status, currentIndex, index, isCompleted }: OrderStatusStepProps) {
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
        {getOrderStatusLabel(status)}
      </span>
    </div>
  );
}