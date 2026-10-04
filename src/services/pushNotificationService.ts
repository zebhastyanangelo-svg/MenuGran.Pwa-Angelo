/**
 * Servicio de notificaciones push de MenuGran (Web Push / VAPID).
 *
 * Flujo:
 *  1. El navegador se suscribe con la clave pública VAPID de MenuGran.
 *  2. La suscripción se persiste en `user_push_subscriptions` (Supabase).
 *  3. La Edge Function `send-push-notification` entrega los push usando la
 *     clave privada VAPID (que vive solo en el servidor).
 *
 * La clave pública es, por diseño, información pública (no es un secreto).
 */

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase, TABLE_NAMES } from './supabase';
import type { UserPushSubscriptionInsert } from '../types/database';

/**
 * Clave pública VAPID con la que el navegador se suscribe.
 *
 * Se lee de `VITE_WEB_PUSH_PUBLIC_KEY` para que rotar la clave no exija
 * recompilar el bundle. El fallback replica `app_push_config.vapid_public_key`
 * (la fuente de verdad del par VAPID) y ambos deben coincidir con la clave
 * privada que usa la Edge Function.
 */
const FALLBACK_VAPID_PUBLIC_KEY =
  'BNhcrcsKnkvKvPQBUUA8h3a9z_91SJAA_Vsqv156f_ZNBhRY1xyjxiWtboXCzIZKpN5dc93dOyPLCocBkglrr2k';

export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim() || FALLBACK_VAPID_PUBLIC_KEY;

/** Indica si la clave pública viene de la variable de entorno (configuración recomendada). */
export const isVapidKeyFromEnv =
  (import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim().length ?? 0) > 0;

export type SubscribePushResult =
  | { status: 'subscribed'; alreadySubscribed: boolean }
  | { status: 'unsupported' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export interface PushSendSummary {
  sent: number;
  failed: number;
  /** Suscripciones eliminadas por el servidor al confirmar un 404/410. */
  deleted: number;
  /** @deprecated Alias de `deleted`, conservado por compatibilidad. */
  deactivated: number;
  total: number;
  /** Respuestas 401/403: el problema es la configuración VAPID, no el cliente. */
  authErrors?: number;
  /** `'env'` o `'db'`: de dónde se obtuvo el par de claves VAPID. */
  vapidSource?: string;
  /** Mensaje del primer fallo local de configuración detectado. */
  configError?: string;
}

export type SendPushResult =
  | { ok: true; summary: PushSendSummary }
  | { ok: false; message: string };

interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Indica si el navegador actual soporta Web Push (SW + PushManager + Notification). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Convierte una clave VAPID base64url en el Uint8Array que espera el navegador. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray;
}

/** Guarda (o reactiva) la suscripción del dispositivo en Supabase. */
async function persistSubscription(userId: string, subscription: PushSubscriptionPayload): Promise<void> {
  const row: UserPushSubscriptionInsert = {
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    is_active: true,
  };

  const { error } = await supabase
    .from(TABLE_NAMES.userPushSubscriptions)
    .upsert(row, { onConflict: 'endpoint' });

  if (error !== null) {
    throw new Error('No se pudo registrar tu dispositivo para notificaciones.');
  }
}

/**
 * Suscribe el dispositivo actual del usuario a las notificaciones push.
 * Reutiliza la suscripción existente del navegador si ya existe.
 */
export async function subscribeCurrentUserToPush(userId: string): Promise<SubscribePushResult> {
  if (!isPushSupported()) {
    return { status: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { status: 'denied' };
    }

    const registration = await navigator.serviceWorker.ready;
    const { subscription, reused } = await getOrCreateSubscription(registration);

    const payload = serializeSubscription(subscription);
    if (payload === null) {
      return { status: 'error', message: 'La suscripción push devuelta por el navegador es inválida.' };
    }

    await persistSubscription(userId, payload);

    return { status: 'subscribed', alreadySubscribed: reused };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Error al suscribirse a las notificaciones.',
    };
  }
}

function serializeSubscription(subscription: PushSubscription): PushSubscriptionPayload | null {
  const serialized = subscription.toJSON();
  if (
    serialized.endpoint === undefined ||
    serialized.keys?.p256dh === undefined ||
    serialized.keys?.auth === undefined
  ) {
    return null;
  }

  return {
    endpoint: serialized.endpoint,
    keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth },
  };
}

/**
 * Indica si la suscripción del navegador se creó con la clave pública VAPID
 * que la app usa hoy.
 *
 * Las suscripciones están ligadas al `applicationServerKey` con el que se
 * crearon: si la clave VAPID se rota, el navegador sigue devolviendo la
 * suscripción antigua y el push service rechaza los envíos. En ese caso hay
 * que desuscribir y volver a suscribir.
 */
function isSubscriptionKeyedToCurrentVapidKey(subscription: PushSubscription): boolean {
  const options = subscription.options;
  const existingKey = options?.applicationServerKey;
  if (existingKey === null || existingKey === undefined) return false;

  const currentKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const existingBytes = new Uint8Array(existingKey);
  if (existingBytes.byteLength !== currentKey.byteLength) return false;

  return existingBytes.every((byte, index) => byte === currentKey[index]);
}

/** Suscripción obtenida del navegador, junto con si se reutilizó o se creó. */
interface ResolvedSubscription {
  subscription: PushSubscription;
  reused: boolean;
}

/**
 * Devuelve la suscripción push vigente del navegador, creándola si no existe
 * y reemplazándola si quedó atada a una clave VAPID anterior.
 */
async function getOrCreateSubscription(
  registration: ServiceWorkerRegistration,
): Promise<ResolvedSubscription> {
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscribeOptions: PushSubscriptionOptionsInit = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  };

  if (existingSubscription === null) {
    const created = await registration.pushManager.subscribe(subscribeOptions);
    return { subscription: created, reused: false };
  }

  if (isSubscriptionKeyedToCurrentVapidKey(existingSubscription)) {
    return { subscription: existingSubscription, reused: true };
  }

  // La suscripción quedó atada a una clave VAPID rotada: se descarta para
  // poder crear una nueva con la clave vigente.
  await existingSubscription.unsubscribe();
  const created = await registration.pushManager.subscribe(subscribeOptions);
  return { subscription: created, reused: false };
}

/** Resultado de reconciliar la suscripción del navegador con la del servidor. */
export type ReconcilePushResult =
  | { status: 'unsupported' }
  | { status: 'permission_denied' }
  | { status: 'absent' }
  | { status: 'synced' }
  | { status: 'error'; message: string };

/**
 * Reconcilia la suscripción push del navegador con el registro en Supabase.
 *
 * Se ejecuta al entrar a la app (sin pedir permiso) y cubre tres casos:
 *  - la suscripción del navegador ya no existe → se registra de nuevo;
 *  - existe pero el registro en Supabase falta o quedó inactivo → se reactiva;
 *  - existe pero apunta a una clave VAPID anterior → se re-suscribe.
 *
 * No solicita permiso si el usuario lo ha denegado: el onboarding sigue
 * siendo el único punto que llama a `Notification.requestPermission()`.
 */
export async function reconcilePushSubscription(userId: string): Promise<ReconcilePushResult> {
  if (!isPushSupported()) return { status: 'unsupported' };
  if (Notification.permission !== 'granted') return { status: 'permission_denied' };

  try {
    const registration = await navigator.serviceWorker.ready;
    const browserSubscription = await registration.pushManager.getSubscription();

    if (browserSubscription === null) {
      return { status: 'absent' };
    }

    const payload = serializeSubscription(browserSubscription);
    if (payload === null) {
      return { status: 'error', message: 'La suscripción push del navegador es inválida.' };
    }

    const { data: existingRows, error: lookupError } = await supabase
      .from(TABLE_NAMES.userPushSubscriptions)
      .select('id, p256dh, auth, is_active')
      .eq('endpoint', payload.endpoint)
      .maybeSingle();

    if (lookupError !== null) {
      return {
        status: 'error',
        message: 'No se pudo verificar tu suscripción de notificaciones.',
      };
    }

    const needsResubscribe = !isSubscriptionKeyedToCurrentVapidKey(browserSubscription);

    // Sin registro, o registrado con otras claves, o inactivo: se reescribe
    // (upsert) para que el endpoint vigente quede asociado al usuario.
    if (
      existingRows === null ||
      existingRows.is_active === false ||
      existingRows.p256dh !== payload.keys.p256dh ||
      existingRows.auth !== payload.keys.auth ||
      needsResubscribe
    ) {
      if (needsResubscribe) {
        await browserSubscription.unsubscribe();
        const fresh = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const freshPayload = serializeSubscription(fresh);
        if (freshPayload === null) {
          return { status: 'error', message: 'La nueva suscripción push es inválida.' };
        }
        await persistSubscription(userId, freshPayload);
        return { status: 'synced' };
      }

      await persistSubscription(userId, payload);
    }

    return { status: 'synced' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Error al sincronizar las notificaciones.',
    };
  }
}

type InvokePushPayload =
  | { target: 'user'; title?: string; body?: string }
  | { target: 'all'; title: string; body: string };

/**
 * Extrae el mensaje de error que devuelve la Edge Function.
 *
 * Cuando la función responde con un 4xx/5xx, supabase-js lanza un
 * `FunctionsHttpError` cuyo `context` es la `Response` sin leer: el cuerpo sigue
 * ahí. Sin este paso el mensaje real (por ejemplo, qué par de claves VAPID está
 * mal) se pierde y el panel solo muestra un error genérico.
 */
async function readEdgeFunctionError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;

  try {
    const payload: unknown = await error.context.json();
    if (typeof payload === 'object' && payload !== null && 'error' in payload) {
      const message = (payload as { error: unknown }).error;
      if (typeof message === 'string' && message.trim() !== '') return message.trim();
    }
  } catch {
    return null;
  }

  return null;
}

/** Invoca la Edge Function send-push-notification con manejo de errores. */
async function invokeSendPushNotification(payload: InvokePushPayload): Promise<SendPushResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session === null) {
      return { ok: false, message: 'Sesión expirada. Inicia sesión nuevamente.' };
    }

    const { data, error } = await supabase.functions.invoke<PushSendSummary>(
      'send-push-notification',
      {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );

    if (error !== null) {
      const serverMessage = await readEdgeFunctionError(error);
      return {
        ok: false,
        message: serverMessage ?? 'No se pudo enviar la notificación. Intenta nuevamente.',
      };
    }

    if (
      data === null ||
      typeof data !== 'object' ||
      typeof data.sent !== 'number' ||
      typeof data.total !== 'number'
    ) {
      return { ok: false, message: 'Respuesta inesperada del servidor de notificaciones.' };
    }

    return { ok: true, summary: data };
  } catch {
    return { ok: false, message: 'Fallo de red al contactar el servidor de notificaciones.' };
  }
}

/** Envía una notificación de prueba al dispositivo del usuario autenticado. */
export function sendTestPushNotification(): Promise<SendPushResult> {
  return invokeSendPushNotification({ target: 'user' });
}

/** Envía una notificación de comercio cercano al dispositivo del usuario autenticado. */
export function sendNearbyMerchantNotification(merchantName: string): Promise<SendPushResult> {
  return invokeSendPushNotification({
    target: 'user',
    title: '¡Comercio cerca de ti!',
    body: `Tienes ${merchantName} cerca. ¡Descubre sus ofertas!`,
  });
}

/** Envía una notificación masiva a todos los clientes (solo superadmin). */
export function sendBulkPushNotification(title: string, body: string): Promise<SendPushResult> {
  return invokeSendPushNotification({ target: 'all', title, body });
}
