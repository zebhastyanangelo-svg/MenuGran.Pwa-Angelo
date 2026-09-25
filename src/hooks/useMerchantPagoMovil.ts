import { useQuery } from '@tanstack/react-query';
import {
  fetchMerchantPagoMovil,
  type MerchantPagoMovilInfo,
} from '../services/merchantPaymentService';

export interface UseMerchantPagoMovilResult {
  pagoMovil: MerchantPagoMovilInfo | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Carga los datos de Pago Móvil configurados por el comercio para que el
 * checkout del cliente pueda mostrarlos antes de confirmar el pedido.
 */
export function useMerchantPagoMovil(
  merchantId: string | null | undefined,
): UseMerchantPagoMovilResult {
  const { data, isLoading, error } = useQuery<MerchantPagoMovilInfo | null>({
    queryKey: ['merchantPagoMovil', merchantId ?? ''],
    enabled: !!merchantId,
    queryFn: () => fetchMerchantPagoMovil(merchantId as string),
  });

  return {
    pagoMovil: data ?? null,
    isLoading: !!merchantId && isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
