import type { OrderRow, OrderStatus } from '../types/database';

/** Estados previos a 'on_the_way' que aparecen en la pestaña "Nuevas" del repartidor. */
export const NEW_DELIVERY_STATUSES: readonly OrderStatus[] = [
  'confirmed',
  'preparing',
  'ready',
];

/** Estados que el panel del repartidor sigue (Nuevas + En camino + Entregadas). */
export const TRACKED_DELIVERY_STATUSES: readonly OrderStatus[] = [
  ...NEW_DELIVERY_STATUSES,
  'on_the_way',
  'delivered',
];

type OrderDeliveryFields = Pick<
  OrderRow,
  'delivery_address' | 'delivery_address_notes' | 'latitude' | 'longitude' | 'delivery_location'
>;

/** Dirección de entrega guardada en la orden; cae en notas o en texto por defecto. */
export function getOrderDeliveryAddress(order: OrderDeliveryFields): string {
  return (
    order.delivery_address ??
    order.delivery_address_notes ??
    'Dirección no disponible'
  );
}

/** Coordenadas [lat, lng] del cliente: columnas explícitas o punto PostGIS. */
export function getOrderDeliveryCoordinates(
  order: OrderDeliveryFields,
): [number, number] | null {
  if (order.latitude != null && order.longitude != null) {
    return [order.latitude, order.longitude];
  }
  if (order.delivery_location) {
    return [order.delivery_location.y, order.delivery_location.x];
  }
  return null;
}

/** URL de navegación en Google Maps; con coordenadas busca el punto exacto. */
export function buildDeliveryMapsUrl(order: OrderDeliveryFields): string {
  const coords = getOrderDeliveryCoordinates(order);
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${coords[0]},${coords[1]}`)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getOrderDeliveryAddress(order))}`;
}

/** URL de navegación en Waze; con coordenadas abre navegación directa al punto. */
export function buildDeliveryWazeUrl(order: OrderDeliveryFields): string {
  const coords = getOrderDeliveryCoordinates(order);
  if (coords) {
    return `https://waze.com/ul?ll=${coords[0]},${coords[1]}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(getOrderDeliveryAddress(order))}`;
}
