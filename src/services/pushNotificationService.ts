/**
 * Servicio de notificaciones push de MenuGram (Web Push / VAPID).
 *
 * Flujo:
 *  1. El navegador se suscribe con la clave pública VAPID de MenuGram.
 *  2. La suscripción se persiste en `user_push_subscriptions` (Supabase).
 *  3. La Edge Function `send-push-notification` entrega los push usando la
 *     clave privada VAPID (que vive solo en el servidor).
 *
 * La clave pública es, por diseño, información pública (no es un secreto).
 */

import { supabase, TABLE_NAMES } from './supabase';
import type { UserPushSubscriptionInsert } from '../types/database';

/** Clave pública VAPID del par de MenuGram (la privada vive solo en el servidor). */
export const VAPID_PUBLIC_KEY =
  'BNhcrcsKnkvKvPQBUUA8h3a9z_91SJAA_Vsqv156f_ZNBhRY1xyjxiWtboXCzIZKpN5dc93dOyPLCocBkglrr2k';

export type SubscribePushResult =
  | { status: 'subscribed'; alreadySubscribed: boolean }
  | { status: 'unsupported' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export interface PushSendSummary {
  sent: number;
  failed: number;
  deactivated: number;
  total: number;
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
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const serialized = subscription.toJSON();
    if (
      serialized.endpoint === undefined ||
      serialized.keys?.p256dh === undefined ||
      serialized.keys?.auth === undefined
    ) {
      return { status: 'error', message: 'La suscripción push devuelta por el navegador es inválida.' };
    }

    const payload: PushSubscriptionPayload = {
      endpoint: serialized.endpoint,
      keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth },
    };
    await persistSubscription(userId, payload);

    return { status: 'subscribed', alreadySubscribed: existingSubscription !== null };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Error al suscribirse a las notificaciones.',
    };
  }
}

type InvokePushPayload =
  | { target: 'user' }
  | { target: 'all'; title: string; body: string };

/** Invoca la Edge Function send-push-notification con manejo de errores. */
async function invokeSendPushNotification(payload: InvokePushPayload): Promise<SendPushResult> {
  try {
    const { data, error } = await supabase.functions.invoke<PushSendSummary>(
      'send-push-notification',
      { body: payload },
    );

    if (error !== null) {
      return { ok: false, message: 'No se pudo enviar la notificación. Intenta nuevamente.' };
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

/** Envía una notificación masiva a todos los clientes (solo superadmin). */
export function sendBulkPushNotification(title: string, body: string): Promise<SendPushResult> {
  return invokeSendPushNotification({ target: 'all', title, body });
}
