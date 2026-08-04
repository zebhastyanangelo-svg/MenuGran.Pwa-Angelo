'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type TrackerStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'LOADING'
  | 'ERROR';

interface OrderData {
  id: string;
  status: string;
  serviceType: string;
  totalPrice: number;
  tableNumber: number | null;
  deliveryAddress: string | null;
  createdAt: string;
  restaurant: { name: string };
  items: Array<{ id: string; quantity: number; menuItem: { name: string } }>;
}

const POLL_MS = 3000;

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* no-op */ }
  }
};

export default function LiveOrderTracker({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<TrackerStatus>('LOADING');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const prevStatusRef = useRef<TrackerStatus>('LOADING');

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 404) { setStatus('ERROR'); setError('Pedido no encontrado'); }
        return;
      }
      const data = await res.json();
      if (!data.success) { setStatus('ERROR'); setError('Pedido no encontrado'); return; }
      const o = data.data as OrderData;
      setOrder(o);
      setStatus((o.status as TrackerStatus) || 'PENDING');
    } catch {
      /* keep last known status, retry next tick */
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    const id = window.setInterval(fetchOrder, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchOrder]);

  const isReady = status === 'READY' || status === 'DELIVERING' || status === 'DELIVERED';
  useEffect(() => {
    const prev = prevStatusRef.current;
    const now = status;
    if (!isReady && prev !== 'LOADING' && now === 'READY' && !muted) {
      vibrate([60, 40, 120]);
    }
    prevStatusRef.current = now;
  }, [status, isReady, muted]);

  const stage = useMemo<'LOADING' | 'ERROR' | 'received' | 'cooking' | 'ready'>(() => {
    if (status === 'LOADING') return 'LOADING';
    if (status === 'ERROR' || status === 'CANCELLED') return 'ERROR';
    if (isReady) return 'ready';
    if (status === 'PREPARING') return 'cooking';
    return 'received';
  }, [status, isReady]);

  const items = order?.items ?? [];
  const short = items.map((i) => i.menuItem.name).slice(0, 3).join(', ');
  const more = items.length > 3 ? ` +${items.length - 3}` : '';

  return (
    <div className="min-h-[80vh] px-4 py-8 sm:px-6 md:px-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="section-eyebrow mb-2">Pedido #{orderId.slice(-4).toUpperCase()}</p>
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
          {order ? `En ${order.restaurant.name}` : 'Cargando...'}
        </h1>
        {order && (
          <p className="mt-2 text-sm text-neutral-500 font-body">
            {order.serviceType === 'MESA' && order.tableNumber
              ? `Mesa ${order.tableNumber} · `
              : order.deliveryAddress ? `Domicilio · ${order.deliveryAddress} · ` : ''}
            {items.length} {items.length === 1 ? 'plato' : 'platos'}
            {short ? ` · ${short}${more}` : ''}
          </p>
        )}
      </header>

      <main className="mx-auto mt-8 max-w-2xl">
        {stage === 'LOADING' && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="h-10 w-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className="text-sm text-neutral-500 font-body">Cargando tu pedido...</p>
          </div>
        )}

        {stage === 'ERROR' && (
          <div className="rounded-2xl border border-danger-200 bg-danger-50 p-8 text-center">
            <div className="mb-3 text-4xl">⚠️</div>
            <p className="text-lg font-semibold text-danger-600 font-display">{error}</p>
            <button type="button" onClick={() => router.push('/client')} className="btn-mg-primary btn-md mt-5">
              Volver al inicio
            </button>
          </div>
        )}

        {stage === 'received' && (
          <div className="rounded-2xl bg-white border border-neutral-200 p-10 text-center shadow-card animate-fade-in">
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              <span className="mg-pulse-ring absolute inline-flex h-24 w-24 rounded-full bg-brand-500/30" />
              <span className="mg-pulse-ring mg-pulse-ring-2 absolute inline-flex h-24 w-24 rounded-full bg-brand-500/30" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-soft">
                📨
              </span>
            </div>
            <h2 className="mt-7 font-display text-2xl font-bold text-ink">¡Tu pedido llegó a la cocina!</h2>
            <p className="mt-2 text-sm text-neutral-500 font-body">Estamos confirmando los detalles con el chef.</p>
          </div>
        )}

        {stage === 'cooking' && (
          <KitchenAnimation />
        )}

        {stage === 'ready' && (
          <ReadyCelebration order={order} muted={muted} setMuted={setMuted} router={router} status={status} />
        )}
      </main>
    </div>
  );
}

function KitchenAnimation() {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center shadow-card animate-fade-in">
      <svg viewBox="0 0 320 200" className="mx-auto w-full max-w-md" role="img" aria-label="Cocinando">
        {/* Cutting board */}
        <rect x="40" y="150" width="240" height="20" rx="6" fill="#F4E3C3" />
        <rect x="40" y="150" width="240" height="20" rx="6" fill="none" stroke="#E0CDA8" strokeWidth="1.5" />
        {/* Veggies */}
        <g className="mg-anim-veggie">
          <circle cx="100" cy="145" r="14" fill="#22C55E" />
          <circle cx="120" cy="148" r="11" fill="#F97316" />
          <circle cx="85"  cy="148" r="10" fill="#EAB308" />
        </g>
        {/* Knife */}
        <g className="mg-anim-chop">
          <rect x="155" y="110" width="60" height="10" rx="2" fill="#9CA3AF" transform="rotate(-20 185 115)" />
          <rect x="150" y="118" width="22" height="14" rx="3" fill="#1F2937" transform="rotate(-20 185 115)" />
        </g>
        {/* Pan */}
        <g className="mg-anim-pan">
          <ellipse cx="230" cy="120" rx="46" ry="10" fill="#1F2937" opacity="0.25" />
          <ellipse cx="230" cy="118" rx="44" ry="8" fill="#9CA3AF" />
          <rect x="270" y="116" width="28" height="4" rx="2" fill="#6B7280" />
          <g className="mg-anim-pan-food">
            <ellipse cx="230" cy="112" rx="24" ry="8" fill="#F97316" />
            <ellipse cx="222" cy="110" rx="8" ry="3" fill="#FBBF24" />
            <ellipse cx="238" cy="110" rx="7" ry="3" fill="#EF4444" />
          </g>
        </g>
        {/* Steam */}
        <g className="mg-anim-pan" opacity="0.5">
          <path className="mg-anim-steam"      d="M222 105 Q218 95 222 88 Q226 80 222 72" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path className="mg-anim-steam mg-anim-steam-2" d="M232 105 Q228 95 232 88 Q236 80 232 72" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path className="mg-anim-steam mg-anim-steam-3" d="M212 105 Q208 95 212 88 Q216 80 212 72" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        {/* Plate being assembled */}
        <g className="mg-anim-plate">
          <ellipse cx="160" cy="60" rx="60" ry="12" fill="#E5E7EB" />
          <ellipse cx="160" cy="58" rx="50" ry="8" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1.5" />
          <circle cx="155" cy="56" r="14" fill="#F97316" />
          <circle cx="155" cy="56" r="9" fill="#FBBF24" />
          {/* Garnish falling */}
          <g className="mg-anim-garnish"      ><circle cx="145" cy="42" r="3" fill="#22C55E" /></g>
          <g className="mg-anim-garnish mg-anim-garnish-2"><circle cx="172" cy="40" r="2.5" fill="#16A34A" /></g>
        </g>
      </svg>
      <h2 className="mt-6 font-display text-2xl font-bold text-ink">El chef está preparando tu plato con amor...</h2>
      <p className="mt-2 text-sm text-neutral-500 font-body">Esto puede tardar unos minutos. Te avisaremos cuando esté listo.</p>
    </div>
  );
}

function ReadyCelebration({
  order, muted, setMuted, router, status,
}: {
  order: OrderData | null;
  muted: boolean;
  setMuted: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
  status: TrackerStatus;
}) {
  const heading =
    status === 'DELIVERING' ? '¡Tu pedido va en camino!' :
    status === 'DELIVERED'  ? '¡Pedido entregado!' :
    '¡Tu pedido está listo!';
  const sub =
    status === 'DELIVERING' ? 'El repartidor se dirige a tu dirección.' :
    status === 'DELIVERED'  ? 'Esperamos que lo hayas disfrutado.' :
    'En breve llegará a tu mesa.';

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center shadow-card mg-anim-fade-pop">
      <Confetti />
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        <span className="text-6xl mg-anim-bell">🔔</span>
      </div>
      <h2 className="mt-6 font-display text-3xl font-extrabold text-brand-600">{heading}</h2>
      <p className="mt-2 text-sm text-neutral-600 font-body">{sub}</p>

      {order && (
        <div className="mt-6 rounded-xl bg-cream-50 border border-neutral-200 p-4 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500 font-body">Total</span>
            <span className="font-bold text-ink font-display">{formatPrice(order.totalPrice)}</span>
          </div>
        </div>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={() => router.push('/client')} className="btn-mg-primary btn-md">
          {status === 'DELIVERED' ? 'Volver al inicio' : 'Hacer otro pedido'}
        </button>
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className="btn-secondary btn-md"
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        >
          {muted ? 'Sonido: off' : 'Sonido: on'}
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      left: (i * 5.5 + 4) % 100,
      delay: (i % 6) * 0.18,
      dur: 1.6 + (i % 4) * 0.25,
      color: ['#E6193A', '#FFB800', '#22C55E', '#3B82F6', '#A855F7'][i % 5],
      size: 7 + (i % 3) * 2,
    })),
    []
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="mg-anim-confetti absolute block rounded-sm"
          style={{
            left: `${p.left}%`,
            top: '-12px',
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
