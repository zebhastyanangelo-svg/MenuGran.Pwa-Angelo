import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPlatformRatingsReport,
  type MerchantRatingDigest,
  type PlatformRatingsReport,
  type RatingInteraction,
} from '../services/superAdminRatingsService';
import type { RatingCategory } from '../utils/ratingCategories';

export type RatingsCategoryFilter = RatingCategory | 'all';

/** Fila del listado detallado: la interacción con su digest de comercio. */
export type RatingDetailRow = RatingInteraction;

interface UseSuperAdminRatingsResult {
  categories: PlatformRatingsReport['categories'] | null;
  averageMerchantStars: number;
  averagePlatformStars: number;
  merchants: MerchantRatingDigest[];
  interactions: RatingDetailRow[];
  isLoading: boolean;
  error: string | null;
  categoryFilter: RatingsCategoryFilter;
  setCategoryFilter: (filter: RatingsCategoryFilter) => void;
  merchantFilter: string;
  setMerchantFilter: (merchantId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function matchesSearch(interaction: RatingDetailRow, query: string): boolean {
  if (query.trim() === '') return true;
  const lower = query.trim().toLowerCase();
  return (
    (interaction.merchantName?.toLowerCase().includes(lower) ?? false) ||
    (interaction.customerName?.toLowerCase().includes(lower) ?? false) ||
    (interaction.customerEmail?.toLowerCase().includes(lower) ?? false) ||
    (interaction.comment?.toLowerCase().includes(lower) ?? false)
  );
}

/**
 * Dashboard de votaciones del superadmin: carga el reporte de valoraciones
 * y mantiene los filtros (categoría, comercio, búsqueda) del listado.
 */
export function useSuperAdminRatings(): UseSuperAdminRatingsResult {
  const [categoryFilter, setCategoryFilter] = useState<RatingsCategoryFilter>('all');
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<PlatformRatingsReport, Error>({
    queryKey: ['superAdminRatings'],
    queryFn: fetchPlatformRatingsReport,
  });

  const filteredInteractions = useMemo(() => {
    const interactions = data?.interactions ?? [];
    return interactions.filter((interaction) => {
      const matchesCategory = categoryFilter === 'all' || interaction.category === categoryFilter;
      const matchesMerchant = merchantFilter === 'all' || interaction.merchantId === merchantFilter;
      return matchesCategory && matchesMerchant && matchesSearch(interaction, searchQuery);
    });
  }, [data, categoryFilter, merchantFilter, searchQuery]);

  return {
    categories: data?.categories ?? null,
    averageMerchantStars: data?.averageMerchantStars ?? 0,
    averagePlatformStars: data?.averagePlatformStars ?? 0,
    merchants: data?.merchants ?? [],
    interactions: filteredInteractions,
    isLoading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
    categoryFilter,
    setCategoryFilter,
    merchantFilter,
    setMerchantFilter,
    searchQuery,
    setSearchQuery,
  };
}

export default useSuperAdminRatings;
