/**
 * Panel del código QR del comercio: vista previa, descarga e impresión.
 *
 * El token vive en `merchants.qr_token`. Si el comercio aún no lo tiene (base
 * creada antes de la migración), se genera uno al abrir y se persiste.
 */

import { useCallback, useEffect, useState } from 'react';
import { Download, Printer, QrCode, RefreshCw } from 'lucide-react';
import type { MerchantRow } from '../../types/database';
import {
  buildMerchantQrUrl,
  buildQrFileName,
  downloadQrPng,
  generateMerchantQrDataUrl,
  generateQrToken,
} from '../../services/qrCodeService';

export interface MerchantQrPanelProps {
  merchant: MerchantRow;
  onPersistToken: (token: string) => Promise<void>;
}

const PREVIEW_SIZE = 512;

export function MerchantQrPanel({ merchant, onPersistToken }: MerchantQrPanelProps) {
  const [qrToken, setQrToken] = useState<string | null>(merchant.qr_token ?? null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  const qrUrl = qrToken === null ? null : buildMerchantQrUrl(qrToken);

  // Genera el QR en cuanto hay token. `qrcode` trabaja fuera de línea.
  useEffect(() => {
    if (qrToken === null) {
      setDataUrl(null);
      return;
    }

    let cancelled = false;
    setError(null);

    void generateMerchantQrDataUrl(qrToken, PREVIEW_SIZE)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo generar el código QR.');
      });

    return () => {
      cancelled = true;
    };
  }, [qrToken]);

  const ensureToken = useCallback(async (): Promise<string> => {
    if (qrToken !== null) return qrToken;

    const freshToken = generateQrToken();
    await onPersistToken(freshToken);
    setQrToken(freshToken);
    return freshToken;
  }, [onPersistToken, qrToken]);

  useEffect(() => {
    if (qrToken !== null || merchant.id === '') return;
    void ensureToken().catch(() => setError('No se pudo crear el código QR.'));
  }, [ensureToken, merchant.id, qrToken]);

  const handleDownload = () => {
    if (dataUrl === null) return;
    downloadQrPng(dataUrl, buildQrFileName(merchant.name));
  };

  const handleRotate = () => {
    setIsRotating(true);
    setError(null);
    void ensureToken()
      .then(() => {
        const freshToken = generateQrToken();
        return onPersistToken(freshToken).then(() => {
          setQrToken(freshToken);
        });
      })
      .catch(() => setError('No se pudo regenerar el código QR.'))
      .finally(() => setIsRotating(false));
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <QrCode className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          Código QR del comercio
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Imprime este código y colócalo en la vitrina, la mesa o el empaque. Al
          escanearlo con la cámara del teléfono, el cliente llega directo a tu menú.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        {error !== null && (
          <p role="alert" className="w-full rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-2">
          {dataUrl !== null ? (
            <img
              src={dataUrl}
              alt={`Código QR de ${merchant.name}`}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className="h-56 w-56"
            />
          ) : (
            <div
              className="flex h-56 w-56 items-center justify-center rounded-md bg-gray-50 text-xs text-gray-400"
              role="status"
            >
              Generando código QR...
            </div>
          )}
        </div>

        {qrUrl !== null && (
          <p className="break-all text-center text-xs text-gray-500">{qrUrl}</p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={dataUrl === null}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar PNG
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={handleRotate}
            disabled={isRotating}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRotating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Regenerar
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Regenerar invalida los códigos impresos anteriores: tendrás que reimprimir.
        </p>
      </div>
    </section>
  );
}