/**
 * Contacto del cliente de una entrega, visto desde el repartidor.
 *
 * `profiles_select_authorized` deja leer el perfil propio, el de un empleado del
 * mismo comercio y el del superadmin. El repartidor asignado al pedido no entra
 * en ninguna de esas ramas, así que el JOIN `profiles!customer_id(...)` de las
 * consultas de entrega llegaba `null`: el repartidor nunca veía el teléfono del
 * cliente y el botón de llamada de la entrega activa no se renderizaba.
 *
 * La función RPC `driver_customer_contact` es la contrapartida de
 * `customer_driver_contact`: devuelve SOLO las columnas de contacto y filtra por
 * `private.is_order_driver`, de modo que ni el cliente ni otro repartidor pueden
 * pedir el teléfono de un tercero.
 */

import { supabase } from './supabase';

/** Columnas de contacto del cliente que el repartidor necesita. */
export interface DriverCustomerContact {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

/** Pedido con su perfil de cliente embebido (el que pintan las vistas del repartidor). */
export interface OrderWithCustomerProfile {
  id: string;
  profiles?: DriverCustomerContact | null;
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normaliza la fila de la RPC. Devuelve `null` cuando la función no devolvió
 * nada: el llamador no es el repartidor del pedido o el pedido no existe.
 */
export function mapDriverCustomerContact(
  row: DriverCustomerContact | null | undefined,
): DriverCustomerContact | null {
  if (!row) return null;
  return {
    full_name: normalizeText(row.full_name),
    email: normalizeText(row.email),
    phone: normalizeText(row.phone),
  };
}

/**
 * Lee el contacto del cliente de un pedido. Devuelve `null` si la RPC no
 * autoriza al llamador, y propaga el error de Supabase si la consulta falla.
 */
export async function fetchDriverCustomerContact(
  orderId: string,
): Promise<DriverCustomerContact | null> {
  if (!orderId.trim()) return null;

  const { data, error } = await supabase.rpc('driver_customer_contact', {
    p_order_id: orderId,
  });
  if (error) throw error;

  const row = ((data ?? []) as DriverCustomerContact[])[0] ?? null;
  return mapDriverCustomerContact(row);
}

/** `true` cuando al pedido le falta el teléfono que necesita el botón de llamada. */
export function needsCustomerContact(order: OrderWithCustomerProfile): boolean {
  return normalizeText(order.profiles?.phone) === null;
}

/**
 * Incorpora el contacto al pedido sin perder lo que ya trajo el JOIN: los datos
 * resueltos por RPC solo rellenan los huecos.
 */
export function attachDriverCustomerContact<T extends OrderWithCustomerProfile>(
  order: T,
  contact: DriverCustomerContact | null,
): T {
  if (contact === null) return order;
  const current = order.profiles ?? null;
  return {
    ...order,
    profiles: {
      full_name: current?.full_name ?? contact.full_name,
      email: current?.email ?? contact.email,
      phone: current?.phone ?? contact.phone,
    },
  };
}

/** Resuelve un pedido. Un fallo puntual deja el pedido tal como vino. */
async function resolveCustomerContact<T extends OrderWithCustomerProfile>(order: T): Promise<T> {
  try {
    const contact = await fetchDriverCustomerContact(order.id);
    return attachDriverCustomerContact(order, contact);
  } catch (err) {
    console.warn('[driverContact] No se pudo resolver el contacto del cliente:', err);
    return order;
  }
}

/**
 * Completa los pedidos cuyo teléfono no llegó por el JOIN, que es lo que
 * dispara el botón "Llamar al cliente" en la entrega activa.
 */
export async function hydrateDriverCustomerContacts<T extends OrderWithCustomerProfile>(
  orders: readonly T[],
): Promise<T[]> {
  const pending = orders.filter(needsCustomerContact);
  if (pending.length === 0) return [...orders];

  const resolved = await Promise.all(pending.map(resolveCustomerContact));
  const byId = new Map(resolved.map((order) => [order.id, order] as const));
  return orders.map((order) => byId.get(order.id) ?? order);
}
