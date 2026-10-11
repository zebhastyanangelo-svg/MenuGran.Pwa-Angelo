/**
 * Modal de ficha completa de un comercio para el Super Admin.
 *
 * Muestra toda la información pública y administrativa del negocio
 * (RIF, datos de contacto, dirección exacta, categoría, modalidades,
 * horarios y estado), sin incluir métricas financieras privadas: esas
 * viven en el modal de métricas, accesible desde el botón de acción.
 */

import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import {
  fetchMerchantDetails,
  type MerchantDetails,
} from '../../services/superAdminService';

export interface MerchantDetailsModalProps {
  merchantId: string;
  merchantName: string;
  /** Propietario y estado conocidos desde el listado (evitan refetch). */
  ownerEmail?: string | null;
  ownerFullName?: string | null;
  /** Fecha de registro del listado (YYYY-MM-DD legible). */
  createdAt?: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Abre el modal de métricas financieras del mismo comercio. */
  onViewMetrics?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending_approval: 'Pendiente',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
};

function DetailRow({
  icon,
  label,
  value,
  mono = false,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
      <span className="inline-flex min-w-0 shrink-0 items-center gap-1.5 text-sm text-slate-600">
        <span className="shrink-0 text-slate-400" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <span
        className={`min-w-0 break-words text-right text-sm font-semibold text-slate-900 ${mono ? 'font-mono tracking-wide' : ''}`}
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando datos del comercio">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
    </div>
  );
}

function formatServiceModalities(modalities: MerchantDetails['service_modalities']): string {
  if (!Array.isArray(modalities) || modalities.length === 0) return 'Sin modalidades';
  return modalities.join(' · ');
}

function formatBusinessHours(hours: MerchantDetails['business_hours']): string {
  if (!hours || (!hours.days && !hours.open_time && !hours.close_time)) {
    return 'Sin horario configurado';
  }
  return `${hours.days} · ${hours.open_time} - ${hours.close_time}`;
}

/** Fecha ISO a "dd/mm/aaaa" legible para el panel administrativo. */
export function formatDetailDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function MerchantDetailsModal({
  merchantId,
  merchantName,
  ownerEmail = null,
  ownerFullName = null,
  createdAt = null,
  isOpen,
  onClose,
  onViewMetrics,
}: MerchantDetailsModalProps) {
  const [details, setDetails] = useState<MerchantDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || merchantId.trim() === '') {
      setDetails(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await fetchMerchantDetails(merchantId);
        if (cancelled) return;
        setDetails(data);
      } catch (caught) {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : 'No se pudieron cargar los datos del comercio.',
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, merchantId]);

  const body = (() => {
    if (!isOpen) return null;
    if (isLoading) return <DetailsSkeleton />;
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
    if (details === null) return null;

    const statusLabel = STATUS_LABELS[details.status] ?? details.status;

    return (
      <div className="space-y-4" data-testid="merchant-details-body">
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          data-testid="merchant-details-status"
        >
          <Badge variant={details.is_active ? 'success' : 'neutral'}>
            {statusLabel}
          </Badge>
          <span className="text-xs text-slate-500">
            Registrado: {formatDetailDate(createdAt)}
          </span>
        </div>

        <section aria-label="Datos fiscales">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
            <i className="fa-solid fa-id-card text-sm text-brand-red" aria-hidden="true" />
            Datos fiscales
          </p>
          <div className="divide-y divide-slate-100">
            <DetailRow
              icon={<i className="fa-solid fa-building text-base" />}
              label="Nombre legal"
              value={details.name}
            />
            <DetailRow
              icon={<i className="fa-solid fa-id-card text-base" />}
              label="RIF"
              value={details.rif}
              mono
              testId="merchant-details-rif"
            />
          </div>
        </section>

        <section aria-label="Datos de contacto y ubicación">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
            <i className="fa-solid fa-location-dot text-sm text-brand-red" aria-hidden="true" />
            Contacto y ubicación
          </p>
          <div className="divide-y divide-slate-100">
            <DetailRow
              icon={<i className="fa-solid fa-location-dot text-base" />}
              label="Dirección"
              value={details.address || 'Sin dirección'}
            />
            <DetailRow
              icon={<i className="fa-solid fa-circle-info text-base" />}
              label="Zona"
              value={details.zone ?? 'Sin zona'}
            />
            <DetailRow
              icon={<i className="fa-solid fa-phone text-base" />}
              label="Teléfono / WhatsApp"
              value={details.phone_whatsapp || 'Sin teléfono'}
              mono
            />
          </div>
        </section>

        <section aria-label="Perfil comercial">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
            <i className="fa-solid fa-store text-sm text-brand-red" aria-hidden="true" />
            Perfil comercial
          </p>
          <div className="divide-y divide-slate-100">
            <DetailRow
              icon={<i className="fa-solid fa-store text-base" />}
              label="Categoría"
              value={details.category}
            />
            <DetailRow
              icon={<i className="fa-solid fa-clock text-base" />}
              label="Modalidades"
              value={formatServiceModalities(details.service_modalities)}
            />
            <DetailRow
              icon={<i className="fa-solid fa-clock text-base" />}
              label="Horario"
              value={formatBusinessHours(details.business_hours)}
            />
          </div>
        </section>

        <section aria-label="Propietario">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
            <i className="fa-solid fa-users text-sm text-brand-red" aria-hidden="true" />
            Propietario
          </p>
          <div className="divide-y divide-slate-100">
            <DetailRow
              icon={<i className="fa-solid fa-users text-base" />}
              label="Nombre"
              value={ownerFullName ?? 'Sin propietario asignado'}
            />
            <DetailRow
              icon={<i className="fa-solid fa-circle-info text-base" />}
              label="Email"
              value={ownerEmail ?? 'sin email'}
            />
          </div>
        </section>
      </div>
    );
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalles de ${merchantName}`}
      footer={
        <div className="flex items-center justify-end gap-3">
          {onViewMetrics !== undefined && (
            <Button
              data-testid="view-merchant-metrics"
              variant="outline"
              onClick={onViewMetrics}
            >
              Ver métricas
            </Button>
          )}
          <Button
            data-testid="close-merchant-details"
            variant="primary"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      }
    >
      {body}
    </Modal>
  );
}

export default MerchantDetailsModal;
