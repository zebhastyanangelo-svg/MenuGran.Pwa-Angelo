import { supabase, TABLE_NAMES } from './supabase';
import { buildProofFileName } from '../utils/imageCompressor';
import type { OrderInsert, PaymentMethod, OrderType, OrderItem, GeoPoint } from '../types/database';

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

interface CreateOrderParams {
  merchantId: string;
  customerId: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  totalAmount: number;
  items: OrderItem[];
  deliveryLocation?: GeoPoint | null;
  deliveryAddressNotes?: string | null;
  tableNumber?: string | null;
}

/**
 * Inserts a real order into the `orders` table and returns the new order ID.
 *
 * The RLS policy `orders_insert_customer` enforces that `customer_id = auth.uid()`,
 * so the caller must supply the authenticated user's ID.
 */
export async function createOrder(params: CreateOrderParams): Promise<string> {
  const orderData: OrderInsert = {
    merchant_id: params.merchantId,
    customer_id: params.customerId,
    type: params.orderType,
    status: 'payment_pending',
    payment_method: params.paymentMethod,
    payment_reference: params.paymentReference || null,
    total_amount: String(params.totalAmount),
    items: params.items,
    delivery_location:
      params.deliveryLocation != null
        ? `(${params.deliveryLocation.x},${params.deliveryLocation.y})`
        : undefined,
    delivery_address_notes: params.deliveryAddressNotes ?? undefined,
    table_number: params.tableNumber ?? undefined,
  };

  console.log('[createOrder] PAYLOAD:', JSON.stringify(orderData, null, 2));

  const { data, error } = await supabase
    .from(TABLE_NAMES.orders)
    .insert(orderData)
    .select('id')
    .single();

  if (error) {
    console.error('[createOrder] ERROR:', error.message, error.code, error.details);
    throw error;
  }

  console.log('[createOrder] SUCCESS:', data.id);
  return data.id;
}

/**
 * Uploads a compressed payment-proof blob to Supabase Storage and returns the
 * storage path (e.g. `orderId/randomHex.jpg`).
 */
export async function uploadPaymentProof(
  file: Blob,
  orderId: string,
): Promise<string> {
  const fileName = buildProofFileName(orderId);

  const { error } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(fileName, file);

  if (error) throw error;
  return fileName;
}
