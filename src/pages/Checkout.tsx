import { useState, useTransition } from 'react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { OrderRow, OrderItem, GeoPoint } from '../types/database';
import { LocationPicker } from '../components/map/LocationPicker';
import { compressImage, PAYMENT_PROOF_MAX_BYTES, buildProofFileName } from '../utils/imageCompressor';
import { formatPrice } from '../types/cart';

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

export function Checkout() {
  const {
    items,
    totalAmount,
    totalItems,
    merchantId,
    clearCart,
  } = useCart();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [bank, setBank] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
   const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<GeoPoint | null>(null);

  // Validaciones
  const canSubmit =
    items.length > 0 &&
    merchantId !== null &&
    profile !== null &&
    bank.trim() !== '' &&
    reference.trim() !== '' &&
    file !== null &&
    !fileError &&
    !isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!canSubmit) return;

    startTransition(async () => {
      try {
        // 1. Comprimir la imagen
        const compressed = await compressImage(file);
        if (compressed.size > PAYMENT_PROOF_MAX_BYTES) {
          throw new Error(
            `No se pudo comprimir el comprobante por debajo de ${PAYMENT_PROOF_MAX_BYTES / 1024} KB.`,
          );
        }

        // 2. Crear la orden primero para obtener su ID (necesario para el nombre del archivo)
        const orderData: Omit<OrderRow, 'id' | 'created_at' | 'items'> & {
          items: OrderItem[];
        } = {
          merchant_id: merchantId!,
          customer_id: profile.id,
          type: 'delivery', // TODO: quizá leer del carrito/contexto; por ahora asumimos delivery
          status: 'payment_pending',
          payment_method: 'pago_movil',
          payment_reference: reference.trim(),
          payment_proof_url: '', // se actualizará después de la subida
           total_amount: totalAmount,
           table_number: null,
           delivery_location: deliveryLocation,
           delivery_address_notes: null,
          // adaptar items del carrito a OrderItem[]
          items: items.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            unit_price: parseFloat(i.product.price),
            notes: i.notes,
          })),
        };

        const { data: order, error: orderError }: { data: OrderRow | null; error: unknown } =
          await supabase
            .from(TABLE_NAMES.orders)
            .insert(orderData)
            .single();

        if (orderError) throw orderError;
        if (!order) throw new Error('No se pudo crear la orden.');

        // 3. Subir comprobante al bucket privado
        const fileName = buildProofFileName(order.id);
        const { error: uploadError } = await supabase
          .storage
          .from(PAYMENT_PROOF_BUCKET)
          .upload(fileName, compressed.blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 4. Obtener URL firmada (válida 1 hora) para el comprobante
        const {
          data: urlData,
          error: urlError,
        } = await supabase
          .storage
          .from(PAYMENT_PROOF_BUCKET)
          .createSignedUrl(fileName, 3600); // 1 hora en segundos

        if (urlError) throw urlError;
        if (!urlData) throw new Error('No se pudo obtener la URL firmada del comprobante.');
        const signedUrl = urlData.signedUrl;

        // 5. Actualizar la orden con la URL del comprobante
        const { error: updateError } = await supabase
          .from(TABLE_NAMES.orders)
          .update({ payment_proof_url: signedUrl })
          .eq('id', order.id);

        if (updateError) throw updateError;

        // 6. Limpiar carrito y redirigir a página de confirmación
        clearCart();
        setIsSubmitSuccess(true);
        // Por ahora redirigimos al marketplace; idealmente iríamos a una página de estado de orden
        navigate('/marketplace', { replace: true });
      } catch (err: any) {
        console.error('Error en checkout:', err);
        setSubmitError(
          err.message ?? 'Ocurrió un error inesperado al procesar el pago.',
        );
      }
    });
  };

  if (isSubmitSuccess) {
    // Mensaje de éxito temporal antes de redirigir (se redirige en handleSubmit)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ¡Orden creada exitosamente!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Su orden está en estado <span className="font-semibold">payment_pending</span>.
            Esperando verificación del comprobante de Pago Móvil.
          </p>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 border-2 border-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-bold">{totalItems}</span>
            </div>
            <span className="text-gray-700">
              {formatPrice(totalAmount)} ({totalItems} ítems)
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {/* Solo mostrar el formulario si hay ítems en el carrito y pertenece a un solo comercio */}
      {items.length === 0 ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tu carrito está vacío</h2>
          <p className="text-lg text-gray-600">
            Agrega productos desde el marketplace antes de proceder al pago.
          </p>
        </div>
      ) : merchantId === null ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Carrito con productos de múltiples comercios
          </h2>
          <p className="text-lg text-gray-600">
            Por favor, vacías el carrito y selecciona productos de un solo comercio.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md space-y-6">
          {/* Resumen del pedido */}
          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Resumen del pedido</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Comercio:</span>
                <span className="font-medium">{items[0].product.merchant_id}</span>
                {/* En una app real mostraríamos el nombre del comercio desde el perfil o contexto */}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ítems:</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-lg">{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Formulario de Pago Móvil */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Datos de Pago Móvil
            </h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco o institución:
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="Ej: BBVA, Banorte, Santander..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de referencia:
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Referencia proporcionada por el comercio al generar la orden"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprobante (foto o PDF):
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] ?? null;
                    setFile(selectedFile);
                    setFileError(null);
                    if (selectedFile) {
                      // Validación básica de tipo y tamaño
                      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
                      if (!validTypes.includes(selectedFile.type)) {
                        setFileError(
                          'Tipo de archivo no soportado. Use JPG, PNG o PDF.',
                        );
                        return;
                      }
                      // 5 MB límite antes de compresión
                      if (selectedFile.size > 5 * 1024 * 1024) {
                        setFileError(
                          'El archivo es demasiado grande (máx. 5 MB antes de compresión).',
                        );
                        return;
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </label>
              {fileError && (
                <p className="mt-1 text-sm text-red-600">{fileError}</p>
              )}
              {file && (
                <p className="mt-1 text-sm text-gray-600">
                  Archivo seleccionado: {file.name} ({Math.round(
                    file.size / 1024,
                  )} KB)
                </p>
              )}
            </div>
          </div>

           {/* Ubicación de entrega */}
           <div className="space-y-2">
             <h3 className="text-sm font-medium text-gray-700">
               Ubicación de entrega
             </h3>
             <p className="text-xs text-gray-500">
               Toca el mapa para colocar el pin de entrega.
             </p>
             <LocationPicker
               initialLocation={deliveryLocation}
               onLocationChange={setDeliveryLocation}
             />
           </div>

           {/* Estado de envío y errores */}
          {isPending && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 border-2 border-indigo-600 rounded-full animate-spin" />
                <span className="text-sm text-gray-600">Procesando pago...</span>
              </div>
            </div>
          )}

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className={`w-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${
              !canSubmit
                ? 'bg-gray-300 text-gray-500'
                : ''
            }`}
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white rounded-full animate-spin" />
                <span className="ml-2">Procesando...</span>
              </>
            ) : (
              <>
                <span>Confirmar y Pagar</span>
                <span className="ml-2">
                  →
                </span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}