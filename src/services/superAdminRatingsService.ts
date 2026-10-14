/**
 * Servicio de votaciones y reputación para el panel del SuperAdmin.
 *
 * Lee todas las encuestas post-pedido (`order_ratings`) junto con el nombre
 * del comercio y los datos del cliente que emitió la valoración, y calcula:
 *  - resumen global de la plataforma (buenas / normales / malas),
 *  - resumen agregado por comercio (para detectar puntajes bajos),
 *  - detalle de cada interacción (comercio, cliente, estrellas, comentario).
 */

import { supabase, TABLE_NAMES } from './supabase';
import { classifyRatingRow, type RatingCategory } from '../utils/ratingCategories';

/** Una valoración individual tal como la consume el dashboard. */
export interface RatingInteraction {
  id: string;
  orderId: string;
  merchantId: string;
  merchantName: string | null;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  merchantStars: number;
  driverStars: number | null;
  platformStars: number;
  category: RatingCategory;
  comment: string | null;
  createdAt: string;
}

/** Resumen agregado de las categorías de calidad. */
export interface RatingCategoriesSummary {
  total: number;
  good: number;
  normal: number;
  bad: number;
}

/** Resumen de reputación de un comercio. */
export interface MerchantRatingDigest {
  merchantId: string;
  merchantName: string | null;
  average: number;
  count: number;
  good: number;
  normal: number;
  bad: number;
}

/** Resultado completo para el dashboard de votaciones. */
export interface PlatformRatingsReport {
  categories: RatingCategoriesSummary;
  averageMerchantStars: number;
  averagePlatformStars: number;
  merchants: MerchantRatingDigest[];
  interactions: RatingInteraction[];
}

/** Datos del perfil del cliente embebidos en la consulta de valoraciones. */
interface CustomerProfileEmbed {
  full_name: string | null;
  email: string | null;
}

interface RatingQueryRow {
  id: string;
  order_id: string;
  merchant_id: string;
  customer_id: string;
  merchant_stars: number;
  driver_stars: number | null;
  platform_stars: number;
  platform_comment: string | null;
  created_at: string;
  merchants: { name: string } | { name: string }[] | null;
  customer: CustomerProfileEmbed | CustomerProfileEmbed[] | null;
}

/**
 * Campos de `order_ratings` que consume el dashboard.
 *
 * `order_ratings` referencia `profiles` con dos llaves foráneas
 * (`customer_id` y `driver_id`), así que el embed debe nombrar la relación
 * de forma explícita; si no, PostgREST responde:
 * `Could not embed because more than one relationship was found`.
 */
const RATINGS_SELECT = `
  id,
  order_id,
  merchant_id,
  customer_id,
  merchant_stars,
  driver_stars,
  platform_stars,
  platform_comment,
  created_at,
  merchants ( name ),
  customer:profiles!order_ratings_customer_id_fkey ( full_name, email )
`;

function extractMerchantName(row: RatingQueryRow): string | null {
  const merchants = row.merchants;
  if (Array.isArray(merchants) && merchants.length > 0) {
    return merchants[0].name ?? null;
  }
  if (merchants !== null && !Array.isArray(merchants)) {
    return merchants.name ?? null;
  }
  return null;
}

function extractCustomerProfile(row: RatingQueryRow): CustomerProfileEmbed | null {
  const customer = row.customer;
  if (Array.isArray(customer)) {
    return customer.length > 0 ? customer[0] : null;
  }
  return customer ?? null;
}

function buildInteraction(row: RatingQueryRow): RatingInteraction | null {
  const category = classifyRatingRow({
    merchantStars: row.merchant_stars,
    platformStars: row.platform_stars,
  });
  if (category === null) return null;
  const customerProfile = extractCustomerProfile(row);
  return {
    id: row.id,
    orderId: row.order_id,
    merchantId: row.merchant_id,
    merchantName: extractMerchantName(row),
    customerId: row.customer_id,
    customerName: customerProfile?.full_name ?? null,
    customerEmail: customerProfile?.email ?? null,
    merchantStars: row.merchant_stars,
    driverStars: row.driver_stars,
    platformStars: row.platform_stars,
    category,
    comment: row.platform_comment,
    createdAt: row.created_at,
  };
}

function buildCategorySummary(
  interactions: readonly RatingInteraction[],
): RatingCategoriesSummary {
  const summary: RatingCategoriesSummary = { total: 0, good: 0, normal: 0, bad: 0 };
  for (const interaction of interactions) {
    summary.total += 1;
    summary[interaction.category] += 1;
  }
  return summary;
}

function computeAverage(stars: readonly number[]): number {
  if (stars.length === 0) return 0;
  const total = stars.reduce((sum, value) => sum + value, 0);
  return total / stars.length;
}

function buildMerchantDigests(
  interactions: readonly RatingInteraction[],
): MerchantRatingDigest[] {
  const grouped = new Map<string, MerchantRatingDigest>();
  for (const interaction of interactions) {
    const existing = grouped.get(interaction.merchantId);
    if (existing === undefined) {
      grouped.set(interaction.merchantId, {
        merchantId: interaction.merchantId,
        merchantName: interaction.merchantName,
        average: interaction.merchantStars,
        count: 1,
        good: interaction.category === 'good' ? 1 : 0,
        normal: interaction.category === 'normal' ? 1 : 0,
        bad: interaction.category === 'bad' ? 1 : 0,
      });
      continue;
    }
    existing.count += 1;
    if (interaction.category === 'good') existing.good += 1;
    else if (interaction.category === 'normal') existing.normal += 1;
    else existing.bad += 1;
    existing.average =
      (existing.average * (existing.count - 1) + interaction.merchantStars) / existing.count;
  }

  // Los comercios con peor reputación primero: son los que requieren gestión.
  return [...grouped.values()].sort((a, b) => a.average - b.average);
}

/**
 * Descarga todas las valoraciones y arma el reporte completo del dashboard.
 * Lanza `Error` con el mensaje de Supabase si la consulta falla.
 */
export async function fetchPlatformRatingsReport(): Promise<PlatformRatingsReport> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.orderRatings)
    .select(RATINGS_SELECT)
    .order('created_at', { ascending: false });

  if (error !== null) {
    throw new Error(`No se pudieron obtener las votaciones: ${error.message}`);
  }

  const rows = data as unknown as RatingQueryRow[];
  const interactions = rows
    .map(buildInteraction)
    .filter((interaction): interaction is RatingInteraction => interaction !== null);

  return {
    categories: buildCategorySummary(interactions),
    averageMerchantStars: computeAverage(interactions.map((i) => i.merchantStars)),
    averagePlatformStars: computeAverage(interactions.map((i) => i.platformStars)),
    merchants: buildMerchantDigests(interactions),
    interactions,
  };
}
