import Link from 'next/link';
import { Star, Clock, MapPin, Utensils } from 'lucide-react';

export interface BentoRestaurant {
  id: string;
  name: string;
  address: string;
  dishCount: number;
  category?: string;
  featured?: boolean;
  promo?: string;
  rating?: number;
  deliveryMin?: number;
}

interface BentoCardProps {
  restaurant: BentoRestaurant;
  index?: number;
}

export default function BentoCard({ restaurant, index = 0 }: BentoCardProps) {
  // Featured (first 2) cards span 2 cols on lg; creates the Bento asymmetry.
  const featured = restaurant.featured || index < 2;
  const span = featured ? 'bento-span-2 bento-row-2' : '';

  return (
    <Link
      href={`/client/r/${restaurant.id}`}
      className={`bento-card-hover group relative flex flex-col ${span}`}
      aria-label={`Ver menú de ${restaurant.name}`}
    >
      {/* Food photography area (image placeholder w/ gradient overlay) */}
      <div className="relative h-full min-h-[120px] flex-1 overflow-hidden bg-gradient-to-br from-primary-100 via-primary-200 to-cta-200">
        {/* ponytail: placeholder gradient — swap to <Image> when food photos exist */}
        <div className="absolute inset-0 food-image-overlay" />

        {/* Promo badge */}
        {restaurant.promo && (
          <span className="absolute left-3 top-3 mg-badge-promo z-10">
            {restaurant.promo}
          </span>
        )}

        {/* Category badge */}
        {restaurant.category && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-primary-700 backdrop-blur">
            {restaurant.category}
          </span>
        )}

        {/* Bottom content over image */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4">
          <h3 className="font-display text-lg font-bold leading-tight text-white drop-shadow-md md:text-xl">
            {restaurant.name}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-white/90">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{restaurant.address}</span>
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex items-center justify-between gap-2 border-t border-neutral-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3 text-xs font-medium text-ink-light">
          <span className="inline-flex items-center gap-1 text-gold-700">
            <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
            {restaurant.rating ?? 4.5}
          </span>
          {restaurant.deliveryMin && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {restaurant.deliveryMin} min
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Utensils className="h-3.5 w-3.5" />
            {restaurant.dishCount} platos
          </span>
        </div>
        <span className="text-xs font-semibold text-primary-600 transition-colors group-hover:text-primary-700">
          Ver menú →
        </span>
      </div>

      {/* Loyalty progress (spec: Gamified Loyalty Progress) */}
      {featured && (
        <div className="border-t border-neutral-100 bg-primary-50/50 px-4 py-2">
          <p className="mb-1 text-[11px] font-medium text-primary-700">
            ¡Estás a 1 pedido de envío gratis!
          </p>
          <div className="loyalty-progress">
            <div className="loyalty-progress-bar" style={{ width: '75%' }} />
          </div>
        </div>
      )}
    </Link>
  );
}
