export { OrderStatus, PaymentMethod, ServiceType } from "@prisma/client";
export type {
  OrderStatus as OrderStatusType,
  PaymentMethod as PaymentMethodType,
  ServiceType as ServiceTypeType,
} from "@prisma/client";

export const ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  READY: "READY",
  DELIVERING: "DELIVERING",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export const PAYMENT_METHOD = {
  CASH: "CASH",
  CARD: "CARD",
  TRANSFER: "TRANSFER",
} as const;

export const SERVICE_TYPE = {
  MESA: "MESA",
  DELIVERY: "DELIVERY",
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY: "Listo",
  DELIVERING: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};
