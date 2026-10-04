/**
 * Resuelve el token de un código QR y lleva al cliente a la tienda.
 *
 * Es el destino de los QR impresos por el comercio. Deliberadamente no exige
 * sesión: el cliente escanea con la cámara del teléfono y debe llegar al menú.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { supabase, TABLE_NAMES } from '../services/supabase';

type ResolveState = 'loading' | 'redirecting' | 'invalid';

/**
 * Busca el comercio por `qr_token`. Se limita a comercios visibles (activos y
 * aprobados) para que un QR impreso de un comercio suspendido no lo exponga.
 */
async function findMerchantIdByToken(qrToken: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.merchants)
    .select('id')
    .eq('qr_token', qrToken)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle();

  if (error !== null) throw new Error('No se pudo validar el código QR.');

  return data?.id ?? null;
}

export function MerchantQrRedirectPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<ResolveState>('loading');

  useEffect(() => {
    if (token === undefined) {
      setState('invalid');
      return;
    }

    let cancelled = false;

    void findMerchantIdByToken(token)
      .then((merchantId) => {
        if (cancelled) return;

        if (merchantId === null) {
          setState('invalid');
          return;
        }

        setState('redirecting');
        navigate(`/merchant/${merchantId}`, { replace: true });
      })
      .catch(() => {
        if (!cancelled) setState('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  if (state === 'invalid') {
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
      >
        <QrCode className="h-12 w-12 text-slate-300" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">Código QR no válido</h1>
        <p className="text-sm text-slate-600">
          Este código no corresponde a ningún comercio activo. Es posible que el comercio
          haya cambiado su código o que ya no esté disponible.
        </p>
        <Link
          to="/marketplace"
          className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c80024]"
        >
          Ver comercios disponibles
        </Link>
      </div>
    );
  }

  return (
    <div role="status" className="py-16 text-center text-slate-500">
      {state === 'redirecting' ? 'Abriendo el comercio...' : 'Validando código QR...'}
    </div>
  );
}