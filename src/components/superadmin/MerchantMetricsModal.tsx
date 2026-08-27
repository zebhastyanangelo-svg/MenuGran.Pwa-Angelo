import { ClipboardList, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { useMerchantMetrics } from '../../hooks/useMerchantMetrics';
import { formatCurrency } from '../../utils/format';
import type { MerchantMetrics } from '../../services/merchantMetricsService';

export interface MerchantMetricsModalProps {
  merchantId: string;
  merchantName: string;
  isOpen: boolean;
  onClose: () => void;
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-2 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div
      className="space-y-2"
      role="status"
      aria-label="Cargando métricas del comercio"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
    </div>
  );
}

function activityColor(level: MerchantMetrics['activityLevel']): string {
  switch (level) {
    case 'Alta':
      return 'text-emerald-700';
    case 'Media':
      return 'text-amber-700';
    case 'Baja':
      return 'text-orange-700';
    default:
      return 'text-slate-500';
  }
}

function MetricsGrid({ metrics }: { metrics: MerchantMetrics }) {
  return (
    <div className="space-y-1">
      <MetricRow
        label="Ingresos procesados"
        value={formatCurrency(metrics.totalRevenue)}
      />
      <MetricRow label="Pedidos totales" value={String(metrics.totalOrders)} />
      <div className="flex justify-between gap-2 py-2">
        <span className="text-sm text-slate-600">
          Desglose completados vs cancelados
        </span>
        <span className="text-sm font-semibold text-slate-900">
          <Badge variant="success" className="mr-1">
            {metrics.completedOrders} completados
          </Badge>
          <Badge variant="danger">{metrics.cancelledOrders} cancelados</Badge>
        </span>
      </div>
      <MetricRow
        label="Ticket promedio"
        value={formatCurrency(metrics.averageTicket)}
      />
      <div className="flex justify-between gap-2 py-2">
        <span className="text-sm text-slate-600">Nivel de actividad</span>
        <span
          className={`text-sm font-semibold ${activityColor(metrics.activityLevel)}`}
        >
          {metrics.activityLevel} ({metrics.ordersLast30Days} en 30 días)
        </span>
      </div>
    </div>
  );
}

/**
 * Modal de métricas individuales por comercio para el Super Admin.
 * Consulta los pedidos del comercio, calcula resumen financiero y de
 * actividad, y expone un botón de cierre accesible.
 */
export function MerchantMetricsModal({
  merchantId,
  merchantName,
  isOpen,
  onClose,
}: MerchantMetricsModalProps) {
  const { metrics, isLoading, error } = useMerchantMetrics(merchantId, isOpen);

  const body = (() => {
    if (!isOpen) return null;
    if (isLoading) return <MetricSkeleton />;
    if (error !== null) {
      return (
        <p
          className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      );
    }
    if (metrics === null) return null;
    return <MetricsGrid metrics={metrics} />;
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Métricas de ${merchantName}`}
      footer={
        <Button
          data-testid="close-metrics-modal"
          variant="outline"
          onClick={onClose}
          leftIcon={<X className="h-4 w-4" />}
        >
          Cerrar
        </Button>
      }
    >
      <div className="flex items-start gap-3">
        <ClipboardList className="mt-0.5 h-5 w-5 text-brand-red" aria-hidden="true" />
        {body}
      </div>
    </Modal>
  );
}

export default MerchantMetricsModal;
