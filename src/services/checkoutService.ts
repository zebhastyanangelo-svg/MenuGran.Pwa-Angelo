import { supabase, TABLE_NAMES } from './supabase';
import { buildProofFileName, buildTempProofFileName } from '../utils/imageCompressor';
import type { OrderInsert, PaymentMethod, OrderType, OrderItem, GeoPoint } from '../types/database';

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

/**
 * Intentos de subida del comprobante ante errores de red transitorios.
 * El "Failed to fetch" típico de conexiones móviles inestables se resuelve
 * solo en parte con reintentos; los errores del servidor (RLS, 4xx) no se
 * reintentan porque volverían a fallar igual.
 */
const UPLOAD_MAX_ATTEMPTS = 3;
const UPLOAD_RETRY_BASE_DELAY_MS = 600;

/**
 * Patrones de los mensajes que emite `fetch` cuando la petición muere a
 * nivel de red: Chrome ("Failed to fetch"), Safari ("Load failed") y Firefox
 * ("NetworkError when attempting to fetch resource"). supabase-js puede
 * envolverlos en StorageUnknownError, pero el mensaje original se conserva.
 */
const NETWORK_ERROR_PATTERN =
  /(failed to fetch|load failed|fetch failed|networkerror|network request failed)/i;

/** `true` si el error de subida es un fallo de red (transitorio) y conviene reintentar. */
export function isNetworkUploadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (NETWORK_ERROR_PATTERN.test(error.message) || error.name === 'TypeError')
  );
}

/**
 * `true` si el servidor respondió que el objeto ya existe. Como el nombre del
 * comprobante es aleatorio en cada subida, un "ya existe" en un reintento
 * solo puede venir de un intento anterior que sí llegó a Storage pero cuya
 * respuesta se perdió en la red: la subida ya completó.
 */
function isAlreadyUploadedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /(already exists|duplicate|conflict)/i.test(error.message)
  );
}

/** Pausa entre reintentos; crece linealmente con el número de intento. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Envuelve el blob comprimido en un `File` con nombre y tipo: los archivos
 * elegidos desde Google Drive llegan con el MIME vacío y suben sin cabecera
 * de contenido correcta en la parte multipart.
 */
function toUploadFile(file: Blob): Blob | File {
  if (typeof File === 'undefined' || file instanceof File) return file;
  try {
    return new File([file], 'comprobante.jpg', { type: file.type || 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Ejecuta una subida reintentando solo los fallos de red. */
async function uploadProofWithRetry(
  fileName: string,
  body: Blob | File,
): Promise<string> {
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      const { error } = await supabase.storage
        .from(PAYMENT_PROOF_BUCKET)
        .upload(fileName, body);
      if (error) throw error;
      return fileName;
    } catch (error) {
      if (attempt > 1 && isAlreadyUploadedError(error)) return fileName;
      if (!isNetworkUploadError(error) || attempt === UPLOAD_MAX_ATTEMPTS) {
        throw error;
      }
      await wait(UPLOAD_RETRY_BASE_DELAY_MS * attempt);
    }
  }
  throw new Error('No se pudo subir el comprobante.');
}

interface CreateOrderParams {
  merchantId: string;
  customerId: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  totalAmount: number;
  items: OrderItem[];
  deliveryLocation?: GeoPoint | null;
  deliveryAddress?: string | null;
  deliveryAddressNotes?: string | null;
  tableNumber?: string | null;
  paymentProofUrl?: string | null;
  /**
   * Snapshot del costo de envío cobrado (USD). El checkout lo resuelve desde
   * `merchants.delivery_fee` y lo congela aquí para que cambiar la tarifa del
   * comercio no altere el histórico de pedidos ya realizados.
   */
  deliveryFee?: number | null;
}

/**
 * Inserts a real order into the `orders` table and returns the new order ID.
 *
 * The RLS policy `orders_insert_customer` enforces that `customer_id = auth.uid()`,
 * so the caller must supply the authenticated user's ID.
 *
 * Note: We omit `delivery_location` (PostGIS point) because PostgREST doesn't accept
 * the `(x,y)` string format directly. Instead we use the `latitude`/`longitude`
 * float8 columns which work reliably.
 */
export async function createOrder(params: CreateOrderParams): Promise<string> {
  const orderData: OrderInsert = {
    merchant_id: params.merchantId,
    customer_id: params.customerId,
    type: params.orderType,
    status: 'payment_pending',
    payment_method: params.paymentMethod,
    payment_reference: params.paymentReference || null,
    payment_proof_url: params.paymentProofUrl ?? undefined,
    total_amount: String(params.totalAmount),
    delivery_fee: String(params.deliveryFee ?? 0),
    items: params.items,
    latitude: params.deliveryLocation?.y ?? undefined,
    longitude: params.deliveryLocation?.x ?? undefined,
    delivery_address: params.deliveryAddress ?? undefined,
    delivery_address_notes: params.deliveryAddressNotes ?? undefined,
    table_number: params.tableNumber ?? undefined,
  };

  const { data, error } = await supabase
    .from(TABLE_NAMES.orders)
    .insert(orderData)
    .select('id')
    .single();

  if (error) {
    console.error('[createOrder] ERROR:', error.message, error.code, error.details);
    throw error;
  }

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
  return uploadProofWithRetry(fileName, toUploadFile(file));
}

/**
 * Updates the `payment_proof_url` column on an existing order row so the
 * merchant dashboard can retrieve and display the uploaded proof.
 */
export async function savePaymentProofUrl(
  orderId: string,
  paymentProofUrl: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAMES.orders)
    .update({ payment_proof_url: paymentProofUrl })
    .eq('id', orderId);

  if (error) throw error;
}

/**
 * Uploads a payment-proof blob to Supabase Storage using a temporary filename
 * (no orderId dependency). Returns the storage path. This allows uploading
 * the proof BEFORE the order is created, so the URL can be included in the
 * initial INSERT. Los fallos de red (p. ej. `Failed to fetch` en móvil) se
 * reintentan hasta 3 veces antes de rendirse.
 */
export async function uploadPaymentProofTemp(file: Blob): Promise<string> {
  return uploadProofWithRetry(buildTempProofFileName(), toUploadFile(file));
}
