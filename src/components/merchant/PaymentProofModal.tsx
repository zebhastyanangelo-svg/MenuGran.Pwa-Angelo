import { formatPrice } from '../../types/cart';
import type { OrderRow } from '../../types/database';

export interface PaymentProofModalProps {
  order: OrderRow | null;
  proofUrl: string | null;
  error?: string | null;
  onClose: () => void;
}

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

export function PaymentProofModal({
  order,
  proofUrl,
  error,
  onClose,
}: PaymentProofModalProps) {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Comprobante de Pago"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Comprobante de Pago
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-bold"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="mb-4 space-y-1 bg-gray-50 p-3 rounded text-sm text-gray-700">
          <p>
            <span className="font-semibold">Pedido ID:</span> {order.id}
          </p>
          <p>
            <span className="font-semibold">Monto:</span>{' '}
            {formatPrice(order.total_amount)}
          </p>
          <p>
            <span className="font-semibold">Método:</span>{' '}
            {getPaymentMethodLabel(order.payment_method)}
          </p>
          {order.payment_reference && (
            <p>
              <span className="font-semibold">Referencia:</span>{' '}
              {order.payment_reference}
            </p>
          )}
        </div>

        {proofUrl ? (
          <div className="flex justify-center bg-gray-100 p-2 rounded">
            <img
              src={proofUrl}
              alt="Comprobante de Pago"
              className="max-w-full h-auto rounded border border-gray-200 max-h-[400px] object-contain"
            />
          </div>
        ) : error ? (
          <p className="text-center text-red-600 py-6">{error}</p>
        ) : (
          <p className="text-center text-gray-500 py-6">
            No hay comprobante disponible.
          </p>
        )}
      </div>
    </div>
  );
}
