'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import LiveOrderTracker from '@/components/orders/LiveOrderTracker';

export default function OrderStatusPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId ?? '';

  if (!orderId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-ink font-display">Pedido no válido</p>
          <Link href="/client" className="btn-mg-primary btn-md mt-4 inline-flex">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return <LiveOrderTracker orderId={orderId} />;
}
