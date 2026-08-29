import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, Bike } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PaymentProofUploader } from '../components/cart/PaymentProofUploader';
import { LocationPicker } from '../components/map/LocationPicker';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { compressImage } from '../utils/imageCompressor';
import type { GeoPoint, OrderType } from '../types/database';
import { createOrder, uploadPaymentProof } from '../services/checkoutService';

const BANK_ACCOUNTS: { id: string; label: string }[] = [
  { id: 'banco_pichincha', label: 'Banco Pichincha - 1234 5678 9012 3456' },
  { id: 'banco_guayaquil', label: 'Banco Guayaquil - 9876 5432 1098 7654' },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function Checkout() {
  const {
    items,
    totalAmount,
    totalItems,
    validationError,
    canCheckout,
    clearCart,
    merchantId,
  } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [bank, setBank] = useState('');
  const [reference, setReference] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<GeoPoint | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isProofValid = file !== null && file.size <= MAX_IMAGE_BYTES;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!canCheckout) {
      setError(validationError ?? 'No se puede continuar con el pedido.');
      return;
    }
    if (!bank) {
      setError('Selecciona el banco de destino.');
      return;
    }
    if (!reference.trim()) {
      setError('Ingresa el número de comprobante.');
      return;
    }
    if (orderType === 'delivery' && !deliveryLocation) {
      setError('Selecciona tu ubicación de entrega en el mapa.');
      return;
    }
    if (!isProofValid) {
      setError('Adjunta una foto o PDF del comprobante (máx. 5 MB).');
      return;
    }

    setIsProcessing(true);
    try {
      const proofToUpload = file!.type.startsWith('image/')
        ? (await compressImage(file!)).blob
        : file!;

      const orderId = await createOrder({
        merchantId: merchantId!,
        customerId: user!.id,
        orderType,
        paymentMethod: 'pago_movil',
        paymentReference: reference,
        totalAmount: Number(totalAmount),
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: parseFloat(item.product.price),
        })),
        deliveryLocation: orderType === 'delivery' ? deliveryLocation : null,
      });

      await uploadPaymentProof(proofToUpload, orderId);

      showToast({
        variant: 'success',
        title: '¡Pedido enviado!',
        message:
          orderType === 'delivery'
            ? 'Tu pedido con entrega a domicilio fue registrado. El comercio confirmará pronto.'
            : 'Tu pedido para retiro en local fue registrado. El comercio confirmará pronto.',
      });

      clearCart();
      navigate('/marketplace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el comprobante.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!canCheckout) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">{validationError ?? 'Tu carrito no es válido.'}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => navigate('/marketplace')}
          >
            Volver al menú
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4 pb-24">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Finalizar pedido</h1>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Resumen ({totalItems} ítems)
        </h2>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.product.id} className="flex justify-between text-sm text-gray-600">
              <span>
                {item.quantity} × {item.product.title}
              </span>
              <span>
                {new Intl.NumberFormat('es-EC', {
                  style: 'currency',
                  currency: 'USD',
                }).format(parseFloat(item.product.price) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-sm font-bold text-gray-900">
          <span>Total</span>
          <span>
            {new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(
              Number(totalAmount),
            )}
          </span>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-slate-700">Tipo de pedido</legend>
          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setOrderType('delivery')}
              aria-pressed={orderType === 'delivery'}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                orderType === 'delivery'
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bike className="h-4 w-4" aria-hidden="true" />
              Entrega a domicilio
            </button>
            <button
              type="button"
              onClick={() => setOrderType('pickup')}
              aria-pressed={orderType === 'pickup'}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                orderType === 'pickup'
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              Retiro en local
            </button>
          </div>
        </fieldset>

        {orderType === 'delivery' && (
          <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <legend className="flex items-center gap-1 px-1 text-sm font-semibold text-slate-700">
              <MapPin className="h-4 w-4 text-brand-red" aria-hidden="true" />
              Ubicación de entrega
            </legend>
            <LocationPicker
              initialLocation={deliveryLocation}
              onLocationChange={setDeliveryLocation}
              userLocation={null}
            />
          </fieldset>
        )}

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-slate-700">Datos de pago</legend>
          <div className="space-y-3">
            <div>
              <label htmlFor="bank" className="mb-1 block text-sm font-medium text-slate-700">
                Banco de destino
              </label>
              <select
                id="bank"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
              >
                <option value="">Selecciona un banco…</option>
                {BANK_ACCOUNTS.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reference" className="mb-1 block text-sm font-medium text-slate-700">
                Número de comprobante
              </label>
              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej. 000123456789"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <PaymentProofUploader
              file={file}
              error={error}
              isProcessing={isProcessing}
              onFileSelect={(selected) => {
                setFile(selected);
                setError(null);
              }}
            />
          </div>
        </fieldset>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth isLoading={isProcessing} disabled={isProcessing}>
          Confirmar y enviar comprobante
        </Button>
      </form>
    </div>
  );
}
