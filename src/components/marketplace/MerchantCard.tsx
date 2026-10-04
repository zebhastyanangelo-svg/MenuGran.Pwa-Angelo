import { MapPin, Clock } from 'lucide-react';
import type { MerchantRow } from '../../types/database';
import { getMerchantAvailability } from '../../utils/merchantAvailability';

export interface MerchantCardProps {
  merchant: MerchantRow;
  onClick?: (merchant: MerchantRow) => void;
  /** Distancia en km desde la ubicación del usuario. Opcional. */
  distance?: number;
}

export function MerchantCard({ merchant, onClick, distance }: MerchantCardProps) {
  const handleClick = () => {
    if (onClick !== undefined) {
      onClick(merchant);
    }
  };

  const availability = getMerchantAvailability(merchant);

  return (
    <div
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Ver comercio ${merchant.name}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="h-28 w-full bg-gradient-to-r from-brand-red via-[#f34a5f] to-brand-amber/80" aria-hidden="true">
        {merchant.banner_url ? (
          <img
            src={merchant.banner_url}
            alt={merchant.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="relative p-4 pt-0">
        <div className="-mt-8 mb-2 flex items-end justify-between">
          <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md" aria-hidden="true">
            {merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={`Logo de ${merchant.name}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-red-50 text-lg font-bold text-brand-red">
                {merchant.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {typeof distance === 'number' && (
                <>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {distance < 1
                      ? `${Math.round(distance * 1000)} m`
                      : `${distance.toFixed(1)} km`}
                  </span>
                  {distance <= 1 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Cercano (1 km)
                    </span>
                  )}
                </>
              )}
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                availability.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {availability.badgeLabel}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {availability.todayLabel}
            </span>
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-red">
          {merchant.name}
        </h3>
        <p className="mt-1 text-xs text-slate-500">@{merchant.slug}</p>
      </div>
    </div>
  );
}
