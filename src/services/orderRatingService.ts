/**
 * Servicio de encuestas de satisfacción post-pedido de MenuGran.
 *
 * Tras la entrega, el cliente califica en tres pasos secuenciales:
 *  1. Negocio: estrellas (1-5) + velocidad + calidad del servicio.
 *  2. Delivery (solo pedidos de delivery con repartidor): estrellas del
 *     repartidor + velocidad de entrega + trato recibido.
 *  3. MenuGran: estrellas de la plataforma + opciones de mejora + comentario
 *     abierto (habilitado por la opción "Otro").
 *
 * Las estrellas del negocio alimentan el medidor de popularidad del comercio
 * (dashboard del dueño y marketplace). Una calificación negativa del
 * repartidor dispara una alerta push inmediata al superadmin y al dueño del
 * comercio involucrado.
 */

import { supabase, TABLE_NAMES } from './supabase';
import { sendNegativeDriverRatingAlert } from './pushNotificationService';
import type {
  OrderRatingInsert,
  OrderRow,
  SurveyImprovementOption,
  SurveyQualityOption,
  SurveySpeedOption,
} from '../types/database';

/** Umbral (inclusive) a partir del cual la nota al repartidor es negativa. */
export const NEGATIVE_DRIVER_RATING_THRESHOLD = 2;

/** Pasos de la encuesta, en el orden en que se muestran al cliente. */
export type SurveyStep = 'business' | 'delivery' | 'platform';

/** Etiquetas legibles de velocidad (negocio y delivery). */
export const SPEED_OPTION_LABELS: Record<SurveySpeedOption, string> = {
  normal: 'Normal',
  rapido: 'Rápido',
  muy_rapido: 'Muy rápido',
};

/** Etiquetas legibles de calidad de servicio y trato. */
export const QUALITY_OPTION_LABELS: Record<SurveyQualityOption, string> = {
  normal: 'Normal',
  bueno: 'Bueno',
  muy_bueno: 'Muy bueno',
};

/** Opciones de mejora de la plataforma que puede marcar el cliente. */
export const PLATFORM_IMPROVEMENT_OPTIONS: ReadonlyArray<{
  key: SurveyImprovementOption;
  label: string;
}> = [
  { key: 'interfaz', label: 'Interfaz' },
  { key: 'velocidad', label: 'Velocidad de la app' },
  { key: 'variedad_comercios', label: 'Variedad de comercios' },
  { key: 'precios', label: 'Precios' },
  { key: 'atencion_cliente', label: 'Atención al cliente' },
  { key: 'otro', label: 'Otro' },
];

/** Respuestas de la encuesta que recoge el modal paso a paso. */
export interface SurveyAnswers {
  merchantStars: number;
  merchantSpeed: SurveySpeedOption;
  merchantServiceQuality: SurveyQualityOption;
  driverStars: number | null;
  driverSpeed: SurveySpeedOption | null;
  driverTreatment: SurveyQualityOption | null;
  platformStars: number;
  platformImprovements: SurveyImprovementOption[];
  platformComment: string | null;
}

/** Resumen de valoraciones usados por popularidad y métricas. */
export interface RatingSummary {
  average: number;
  count: number;
}

/**
 * Pasos que debe responder el cliente para un pedido concreto:
 * negocio y plataforma siempre; delivery solo si el pedido fue de delivery
 * y tenía repartidor asignado.
 */
export function buildSurveySteps(order: Pick<OrderRow, 'type' | 'driver_id'>): SurveyStep[] {
  const steps: SurveyStep[] = ['business'];
  if (order.type === 'delivery' && order.driver_id !== null) {
    steps.push('delivery');
  }
  steps.push('platform');
  return steps;
}

/** Una nota al repartidor <= 2 estrellas se considera negativa. */
export function isNegativeDriverRating(stars: number | null): boolean {
  return stars !== null && stars >= 1 && stars <= NEGATIVE_DRIVER_RATING_THRESHOLD;
}

/** Valida que las estrellas estén en el rango 1-5. */
function isValidStars(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Valida las respuestas de la encuesta antes de enviarlas.
 * Devuelve `null` si todo es válido; en caso contrario el mensaje de error.
 */
export function validateSurveyAnswers(
  steps: readonly SurveyStep[],
  answers: SurveyAnswers,
): string | null {
  if (!isValidStars(answers.merchantStars)) {
    return 'La calificación del negocio debe estar entre 1 y 5 estrellas.';
  }
  if (steps.includes('delivery') && answers.driverStars !== null && !isValidStars(answers.driverStars)) {
    return 'La calificación del repartidor debe estar entre 1 y 5 estrellas.';
  }
  if (!isValidStars(answers.platformStars)) {
    return 'La calificación de MenuGran debe estar entre 1 y 5 estrellas.';
  }
  if (steps.includes('delivery') && answers.driverStars !== null && answers.driverSpeed === null) {
    return 'Indica la velocidad de entrega del repartidor.';
  }
  if (steps.includes('delivery') && answers.driverStars !== null && answers.driverTreatment === null) {
    return 'Indica el trato recibido del repartidor.';
  }
  if (answers.platformComment !== null && answers.platformComment.trim().length > 500) {
    return 'El comentario no puede superar los 500 caracteres.';
  }
  return null;
}

/** Convierte las respuestas del modal a la fila que se inserta. */
export function buildOrderRatingInsert(
  order: Pick<OrderRow, 'id' | 'merchant_id' | 'customer_id' | 'type' | 'driver_id'>,
  answers: SurveyAnswers,
  steps: readonly SurveyStep[],
): OrderRatingInsert {
  const includesDelivery = steps.includes('delivery');
  return {
    order_id: order.id,
    merchant_id: order.merchant_id,
    customer_id: order.customer_id ?? '00000000-0000-0000-0000-000000000000',
    merchant_stars: answers.merchantStars,
    merchant_speed: answers.merchantSpeed,
    merchant_service_quality: answers.merchantServiceQuality,
    driver_id: includesDelivery ? order.driver_id : null,
    driver_stars: includesDelivery ? answers.driverStars : null,
    driver_speed: includesDelivery ? answers.driverSpeed : null,
    driver_treatment: includesDelivery ? answers.driverTreatment : null,
    platform_stars: answers.platformStars,
    platform_improvements: answers.platformImprovements,
    platform_comment: answers.platformComment,
  };
}

/**
 * Guarda la encuesta del pedido. Si el cliente calificó negativamente al
 * repartidor, envía (fire-and-forget) la alerta push al superadmin y al dueño
 * del comercio para su gestión inmediata.
 */
export async function submitOrderRating(
  order: Pick<OrderRow, 'id' | 'merchant_id' | 'customer_id' | 'type' | 'driver_id'>,
  answers: SurveyAnswers,
  steps: readonly SurveyStep[],
): Promise<void> {
  const validationError = validateSurveyAnswers(steps, answers);
  if (validationError !== null) {
    throw new Error(validationError);
  }

  const insert = buildOrderRatingInsert(order, answers, steps);
  const { error } = await supabase
    .from(TABLE_NAMES.orderRatings)
    .insert(insert);

  if (error !== null) {
    throw new Error(`No se pudo guardar tu calificación: ${error.message}`);
  }

  if (isNegativeDriverRating(answers.driverStars)) {
    // Fire-and-forget: la encuesta ya quedó guardada; la alerta no debe
    // bloquear ni fallar el flujo del cliente si el push falla.
    void sendNegativeDriverRatingAlert(order.id, answers.driverStars ?? 1).catch(() => undefined);
  }
}

/** Indica si el pedido ya tiene una encuesta registrada. */
export async function hasCustomerRatedOrder(orderId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.orderRatings)
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error !== null) {
    throw new Error(`No se pudo verificar la encuesta del pedido: ${error.message}`);
  }
  return data !== null;
}

/** Calcula promedio y cantidad a partir de una lista de estrellas. */
export function summarizeStars(stars: readonly number[]): RatingSummary {
  if (stars.length === 0) {
    return { average: 0, count: 0 };
  }
  const total = stars.reduce((sum, value) => sum + value, 0);
  return { average: total / stars.length, count: stars.length };
}

/**
 * Resumen de valoraciones del negocio: alimenta el medidor de popularidad
 * del comercio y su badge en el marketplace.
 */
export async function fetchMerchantRatingSummary(merchantId: string): Promise<RatingSummary> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.orderRatings)
    .select('merchant_stars')
    .eq('merchant_id', merchantId);

  if (error !== null) {
    throw new Error(`No se pudieron obtener las valoraciones del comercio: ${error.message}`);
  }
  const stars = (data ?? []).map((row: { merchant_stars: number }) => row.merchant_stars);
  return summarizeStars(stars);
}

/**
 * Mapa de valoraciones por comercio para el marketplace: una sola consulta
 * que agrupa las estrellas de todos los comercios visibles en tarjetas.
 */
export async function fetchMerchantRatingsMap(): Promise<Record<string, RatingSummary>> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.orderRatings)
    .select('merchant_id, merchant_stars');

  if (error !== null) {
    throw new Error(`No se pudieron obtener las valoraciones: ${error.message}`);
  }

  const grouped = new Map<string, number[]>();
  for (const row of data ?? []) {
    const list = grouped.get(row.merchant_id) ?? [];
    list.push(row.merchant_stars);
    grouped.set(row.merchant_id, list);
  }

  const result: Record<string, RatingSummary> = {};
  for (const [merchantId, stars] of grouped.entries()) {
    result[merchantId] = summarizeStars(stars);
  }
  return result;
}

/** Resumen de la puntuación general de la plataforma MenuGran. */
export async function fetchPlatformRatingSummary(): Promise<RatingSummary> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.orderRatings)
    .select('platform_stars');

  if (error !== null) {
    throw new Error(`No se pudieron obtener las valoraciones de la plataforma: ${error.message}`);
  }
  const stars = (data ?? []).map((row: { platform_stars: number }) => row.platform_stars);
  return summarizeStars(stars);
}

/** Resumen de las valoraciones recibidas por un repartidor. */
export async function fetchDriverRatingSummary(driverId: string): Promise<RatingSummary> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.orderRatings)
    .select('driver_stars')
    .eq('driver_id', driverId);

  if (error !== null) {
    throw new Error(`No se pudieron obtener las valoraciones del repartidor: ${error.message}`);
  }
  const stars = (data ?? [])
    .map((row: { driver_stars: number | null }) => row.driver_stars)
    .filter((value): value is number => value !== null);
  return summarizeStars(stars);
}
