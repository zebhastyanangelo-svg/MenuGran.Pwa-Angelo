import { Clock, MapPin, ShoppingBag } from 'lucide-react';
import type { MerchantRow } from '../../types/database';
import { getMerchantAvailability } from '../../utils/merchantAvailability';
import { formatEstimatedDeliveryRange, resolveMerchantPromoChips } from '../../utils/promos';

export interface MerchantCardProps {
  merchant: MerchantRow;
  onClick?: (merchant: MerchantRow) => void;
  /** Distancia en km desde la ubicación del usuario. Opcional. */
  distance?: number;
}

const CHIP_BASE =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none';

function PromoChips({ merchant }: { merchant: MerchantRow }) {
  const chips = resolveMerchantPromoChips(merchant);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="merchant-promo-chips">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={`${CHIP_BASE} ${
            chip.kind === 'discount'
              ? 'bg-brand-red text-white shadow-sm'
              : 'bg-brand-amber text-slate-900 shadow-sm'
          }`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function MerchantCard({ merchant, onClick, distance }: MerchantCardProps) {
  const handleClick = () => {
    if (onClick !== undefined) {
      onClick(merchant);
    }
  };

  const availability = getMerchantAvailability(merchant);
  const etaLabel = formatEstimatedDeliveryRange(merchant.estimated_delivery_minutes);
  const isInteractive = onClick !== undefined;

  return (
    <div
      onClick={handleClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={`Ver comercio ${merchant.name}`}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick(merchant);
              }
            }
          : undefined
      }
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red ${
        isInteractive ? 'cursor-pointer' : ''
      }`}
    >
      <div className="relative h-32 w-full bg-gradient-to-r from-brand-red via-[#f34a5f] to-brand-amber/80">
        {merchant.banner_url ? (
          <img
            src={merchant.banner_url}
            alt={merchant.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}

        {/* Los chips flotantes se posicionan sobre la imagen para que el
            descuento sea lo primero que el cliente vea. */}
        <div className="absolute left-2 top-2 right-2 flex items-start justify-between gap-2">
          <PromoChips merchant={merchant} />
          {typeof distance === 'number' ? (
            <span className={`${CHIP_BASE} ml-auto bg-white/95 text-slate-700 shadow-sm`}>
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-0">
        <div className="-mt-8 flex items-end gap-3">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md">
            {merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={`Logo de ${merchant.name}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-red-50 text-lg font-bold text-brand-red"
                aria-hidden="true"
              >
                {merchant.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <h3 className="truncate text-base font-bold leading-tight text-slate-900 group-hover:text-brand-red">
              {merchant.name}
            </h3>
            <p className="truncate text-xs text-slate-500">@{merchant.slug}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${
              availability.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {availability.badgeLabel}
          </span>
          {etaLabel !== null ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-brand-red/10 px-2 py-0.5 font-semibold text-brand-red"
              data-testid="merchant-eta"
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {etaLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {availability.todayLabel}
            </span>
          )}
          <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
            {merchant.category}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={(event) => {
              // El botón vive dentro de una tarjeta accesible; sin esto el clic
              // se propagaría y se dispararía la navegación dos veces.
              event.stopPropagation();
              handleClick();
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-red px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            aria-label={`Pedir menú en ${merchant.name}`}
          >
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
            Pedir menú
          </button>
        </div>
      </div>
    </div>
  );
}