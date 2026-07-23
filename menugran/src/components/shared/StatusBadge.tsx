import { clsx } from 'clsx';

type StatusType =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  | 'active'
  | 'inactive';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'badge-warning',
  },
  preparing: {
    label: 'Preparando',
    className: 'badge-brand',
  },
  ready: {
    label: 'Listo',
    className: 'badge-success',
  },
  delivering: {
    label: 'En camino',
    className: 'badge-brand',
  },
  delivered: {
    label: 'Entregado',
    className: 'badge-success',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'badge-danger',
  },
  active: {
    label: 'Activo',
    className: 'badge-success',
  },
  inactive: {
    label: 'Inactivo',
    className: 'badge-neutral',
  },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={clsx('inline-flex items-center gap-1.5', config.className)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', {
        'bg-warning-500': status === 'pending',
        'bg-brand-500': status === 'preparing' || status === 'delivering',
        'bg-success-500': status === 'ready' || status === 'delivered' || status === 'active',
        'bg-danger-500': status === 'cancelled',
        'bg-neutral-400': status === 'inactive',
      })} />
      {label || config.label}
    </span>
  );
}
