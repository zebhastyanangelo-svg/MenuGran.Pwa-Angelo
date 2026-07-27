'use client';

import { useState } from 'react';
import type { ServiceType } from '@/types';

interface ServiceTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    serviceType: ServiceType;
    tableNumber?: number;
    deliveryAddress?: string;
    lat?: number;
    lng?: number;
  }) => void;
}

export default function ServiceTypeModal({ open, onClose, onSubmit }: ServiceTypeModalProps) {
  const [serviceType, setServiceType] = useState<ServiceType>('MESA');
  const [tableNumber, setTableNumber] = useState('');
  const [address, setAddress] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    if (serviceType === 'MESA') {
      const parsed = parseInt(tableNumber, 10);
      onSubmit({
        serviceType,
        tableNumber: Number.isFinite(parsed) ? parsed : undefined,
      });
    } else {
      onSubmit({
        serviceType,
        deliveryAddress: address || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-elevated p-6 w-full max-w-md">
        <h2 className="font-display text-xl font-semibold text-ink-dark mb-4">
          Tipo de servicio
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setServiceType('MESA')}
            className={`flex-1 py-2 rounded-lg font-medium ${
              serviceType === 'MESA'
                ? 'bg-brand-500 text-white'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            En mesa
          </button>
          <button
            type="button"
            onClick={() => setServiceType('DELIVERY')}
            className={`flex-1 py-2 rounded-lg font-medium ${
              serviceType === 'DELIVERY'
                ? 'bg-brand-500 text-white'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            Delivery
          </button>
        </div>

        {serviceType === 'MESA' ? (
          <label className="block mb-4">
            <span className="text-sm text-neutral-600">Número de mesa</span>
            <input
              type="number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded-lg"
            />
          </label>
        ) : (
          <label className="block mb-4">
            <span className="text-sm text-neutral-600">Dirección de entrega</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded-lg"
            />
          </label>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-neutral-100 text-neutral-700 font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg bg-brand-500 text-white font-medium"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
