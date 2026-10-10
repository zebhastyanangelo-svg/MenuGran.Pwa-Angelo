import { Bike, Clock, MapPin, ShoppingBag, Star } from 'lucide-react';
import type { MerchantRow } from '../../types/database';
import { formatUSD } from '../../utils/format';
import { getMerchantAvailability } from '../../utils/merchantAvailability';
import {
  isDeliveryAvailable,
  parseDeliveryFee,
} from '../../utils/deliveryPolicy';
import { formatEstimatedDeliveryRange, resolveMerchantPromoChips } from '../../utils/promos';
import {
  fullStarsForRating,
  hasVisibleRating,
  ratingToPercent,
  RATING_MAX_STARS,
} from '../../utils/rating';
import type { RatingSummary } from '../../services/orderRatingService';

export interface MerchantCardProps {
  merchant: MerchantRow;
  onClick?: (merchant: MerchantRow) => void;
  /** Distancia en km desde la ubicación del usuario. Opcional. */
  distance?: number;
  /**
   * Resumen de valoraciones del comercio (estrellas de la encuesta
   * post-pedido). `null`/`undefined` oculta el badge; con 0 valoraciones no
   * se muestra para no penalizar a los comercios nuevos.
   */
  rating?: RatingSummary | null;
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

/**
 * Traduce la política de envío del comercio a un chip legible: si no entrega,
 * se dice explícitamente; si entrega, se dice si es gratis o cuánto cuesta.
 * Evita que el cliente descubra la tarifa al final del checkout.
 */
function DeliveryPolicyChip({ merchant }: { merchant: MerchantRow }) {
  if (!isDeliveryAvailable(merchant)) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600"
        data-testid="merchant-delivery-chip"
      >
        <Bike className="h-3 w-3" aria-hidden="true" />
        Sin delivery
      </span>
    );
  }

  const fee = parseDeliveryFee(merchant.delivery_fee ?? null);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800"
      data-testid="merchant-delivery-chip"
    >
      <Bike className="h-3 w-3" aria-hidden="true" />
      {fee !== null && fee > 0 ? `${formatUSD(fee)} envío` : 'Delivery gratis'}
    </span>
  );
}

/**
 * Badge de reputación sobre el banner (esquina inferior derecha): estrellas
 * visuales estilo hotel según la puntuación, acompañadas del porcentaje de
 * valoración equivalente. La cantidad de reseñas ya no se muestra entre
 * paréntesis: eso saturaba el centro de la tarjeta.
 */
function RatingBadge({ rating }: { rating: RatingSummary }) {
  const fullStars = fullStarsForRating(rating.average);
  const percent = ratingToPercent(rating.average);

  return (
    <span
      className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 shadow-sm"
      data-testid="merchant-rating-badge"
      aria-label={`Valoración: ${fullStars} de ${RATING_MAX_STARS} estrellas (${percent} por ciento)`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: RATING_MAX_STARS }, (_, index) => (
          <Star
            key={index}
            className={`h-3 w-3 ${
              index < fullStars
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-slate-300'
            }`}
          />
        ))}
      </span>
      <span className="text-[11px] font-bold leading-none text-slate-800">
        {percent}%
      </span>
    </span>
  );
}

export function MerchantCard({ merchant, onClick, distance, rating }: MerchantCardProps) {
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
      <div className="relative h-32 w-full shrink-0 bg-gradient-to-r from-brand-red via-[#f34a5f] to-brand-amber/80">
        {merchant.banner_url ? (
          <img
            src={merchant.banner_url}
            alt={merchant.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}

        {/* Los chips flotantes se posicionan sobre la imagen para que el
            descuento sea lo primero que el cliente vea. Van arriba: abajo el
            avatar central invade el banner. */}
        <div className="absolute left-2 top-2 right-2 flex items-start justify-between gap-2">
          <PromoChips merchant={merchant} />
          {typeof distance === 'number' ? (
            <span className={`${CHIP_BASE} ml-auto bg-white/95 text-slate-700 shadow-sm`}>
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
            </span>
          ) : null}
        </div>

        {/* Badge de valoración en la esquina inferior derecha del banner:
            estrellas estilo hotel + porcentaje de valoración. */}
        {hasVisibleRating(rating) ? <RatingBadge rating={rating} /> : null}

        {/*
          Avatar anclado al borde inferior del banner: `bottom-0` +
          `translate-y-1/2` dejan exactamente la mitad del círculo sobre la
          imagen y la mitad sobre el contenido, sin márgenes negativos que
          dependan del orden de los hijos. Al estar en flujo absoluto no
          empuja el texto: ese hueco lo reserva el `pt-12` del bloque inferior,
          de modo que ningún nombre o chip queda tapado ni recortado.
        */}
        <div className="absolute bottom-0 left-1/2 z-10 h-16 w-16 -translate-x-1/2 translate-y-1/2 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md">
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
      </div>

      <div className="flex flex-1 flex-col p-4 pt-12">
        <div className="text-center">
          <h3 className="truncate text-base font-bold leading-tight text-slate-900 group-hover:text-brand-red">
            {merchant.name}
          </h3>
          <p className="truncate text-xs text-slate-500">@{merchant.slug}</p>
        </div>

        {/*
          Chips informativos en dos niveles alineados a la izquierda para no
          saturar el centro de la tarjeta: primero el estado operativo
          (abierto/cerrado y tiempo de entrega), luego la categoría y la
          política de envío. El botón "Pedir menú" queda fijo abajo a la
          derecha, sin competencia visual.
        */}
        <div className="mt-3 flex flex-col items-start gap-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
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
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
              {merchant.category}
            </span>
            <DeliveryPolicyChip merchant={merchant} />
          </div>
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