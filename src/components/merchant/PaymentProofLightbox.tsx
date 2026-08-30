import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MouseEvent } from 'react';
import { X, ExternalLink } from 'lucide-react';
import type { OrderRow } from '../../types/database';
import { formatPrice } from '../../types/cart';

function getPaymentMethodLabel(method: OrderRow['payment_method']): string {
  switch (method) {
    case 'pago_movil':
      return 'Pago Móvil';
    case 'cash':
      return 'Efectivo';
    case 'zelle':
      return 'Zelle';
    case 'card':
      return 'Tarjeta';
    default:
      return method;
  }
}

export interface PaymentProofLightboxProps {
  order: OrderRow;
  proofUrl: string;
  error?: string | null;
  onClose: () => void;
}

export function PaymentProofLightbox({
  order,
  proofUrl,
  error,
  onClose,
}: PaymentProofLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-label="Comprobante de pago"
      aria-modal="true"
      data-testid="payment-proof-lightbox"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center w-full h-full bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative flex flex-col items-center w-full h-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between w-full mb-3">
          <div className="text-white text-sm">
            <span className="font-semibold">Pedido #{order.id}</span>
            <span className="mx-2 opacity-50">|</span>
            <span>{formatPrice(order.total_amount)}</span>
            <span className="mx-2 opacity-50">|</span>
            <span>{getPaymentMethodLabel(order.payment_method)}</span>
            {order.payment_reference && (
              <>
                <span className="mx-2 opacity-50">|</span>
                <span className="opacity-75">Ref: {order.payment_reference}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white text-sm bg-white/10 hover:bg-white/20 rounded-md px-3 py-1.5 transition-colors"
              aria-label="Abrir comprobante en nueva pestaña"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Abrir original</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar comprobante"
              className="rounded-full p-2 text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center w-full overflow-auto">
          {error ? (
            <p className="text-center text-red-400 py-6">{error}</p>
          ) : (
            <img
              src={proofUrl}
              alt="Comprobante de pago"
              className="max-w-full max-h-[80vh] object-contain rounded shadow-lg"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
