'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils, faMotorcycle, faXmark, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import type { ServiceType } from '@/types';

interface ServiceTypeModalProps {
  open: boolean;
  onSubmit: (data: { serviceType: ServiceType; tableNumber?: number; deliveryAddress?: string; lat?: number; lng?: number }) => void;
  onClose: () => void;
}

export default function ServiceTypeModal({ open, onSubmit, onClose }: ServiceTypeModalProps) {
  const [step, setStep] = useState<'select' | 'table' | 'delivery'>('select');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [geoLoading, setGeoLoading] = useState(false);

  if (!open) return null;

  const handleGeoLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  };

  const handleConfirm = () => {
    if (step === 'select') return;

    if (step === 'table') {
      if (!tableNumber) return;
      onSubmit({ serviceType: 'MESA', tableNumber: parseInt(tableNumber, 10) });
    }

    if (step === 'delivery') {
      if (!deliveryAddress) return;
      onSubmit({ serviceType: 'DELIVERY', deliveryAddress, lat, lng });
    }

    reset();
  };

  const reset = () => {
    setStep('select');
    setTableNumber('');
    setDeliveryAddress('');
    setLat(undefined);
    setLng(undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Tipo de Pedido</h3>
          <button onClick={() => { reset(); onClose(); }} className="rounded-xl bg-neutral-100 p-2 text-ink-light transition hover:bg-neutral-200">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        {step === 'select' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('table')}
              className="flex w-full items-center gap-4 rounded-xl border border-neutral-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-500">
                <FontAwesomeIcon icon={faUtensils} className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-ink">Comer en Mesa</p>
                <p className="text-sm text-neutral-500">Cenar en el restaurante</p>
              </div>
            </button>
            <button
              onClick={() => setStep('delivery')}
              className="flex w-full items-center gap-4 rounded-xl border border-neutral-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
                <FontAwesomeIcon icon={faMotorcycle} className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-ink">Delivery</p>
                <p className="text-sm text-neutral-500">Entrega a domicilio</p>
              </div>
            </button>
          </div>
        )}

        {step === 'table' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">Ingresa el número de tu mesa</p>
            <input
              type="number"
              min={1}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Ej: 5"
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-center text-2xl font-bold text-ink outline-none transition focus:border-brand-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setStep('select')} className="btn-secondary btn-md flex-1">Atrás</button>
              <button onClick={handleConfirm} disabled={!tableNumber} className="btn-primary btn-md flex-1">Confirmar Mesa</button>
            </div>
          </div>
        )}

        {step === 'delivery' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">Dirección de entrega</p>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Calle, número, colonia..."
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-500"
              rows={3}
              autoFocus
            />
            <button
              onClick={handleGeoLocation}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-ink transition hover:bg-neutral-50"
            >
              <FontAwesomeIcon icon={faLocationDot} className={`h-4 w-4 ${geoLoading ? 'animate-pulse text-brand-500' : 'text-neutral-500'}`} />
              {lat && lng ? 'Ubicación obtenida' : geoLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
            </button>
            <div className="flex gap-3">
              <button onClick={() => setStep('select')} className="btn-secondary btn-md flex-1">Atrás</button>
              <button onClick={handleConfirm} disabled={!deliveryAddress} className="btn-primary btn-md flex-1">Confirmar Delivery</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
