import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, Bike, Smartphone, CreditCard, Banknote } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PaymentProofUploader } from '../components/cart/PaymentProofUploader';
import { LocationPicker } from '../components/map/LocationPicker';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useMerchantPagoMovil } from '../hooks/useMerchantPagoMovil';
import { compressImage } from '../utils/imageCompressor';
import type { GeoPoint, OrderType, PaymentMethod } from '../types/database';
import type { MerchantPagoMovilInfo } from '../services/merchantPaymentService';
import { createOrder, uploadPaymentProofTemp } from '../services/checkoutService';

type CheckoutPaymentMethod = Extract<PaymentMethod, 'pago_movil' | 'card_pos' | 'cash'>;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface ValidateParams {
  paymentMethod: CheckoutPaymentMethod;
  pagoMovil: MerchantPagoMovilInfo | null;
  reference: string;
  file: File | null;
  orderType: OrderType;
  deliveryLocation: GeoPoint | null;
}

function validateCheckoutForm(params: ValidateParams): string | null {
  if (params.paymentMethod === 'pago_movil') {
    if (!params.pagoMovil) {
      return 'El comercio aún no configuró sus datos de Pago Móvil. Elige otro método de pago.';
    }
    if (!params.reference.trim()) {
      return 'Ingresa el número de comprobante.';
    }
    if (params.file === null || params.file.size > MAX_IMAGE_BYTES) {
      return 'Adjunta una foto o PDF del comprobante (máx. 5 MB).';
    }
  }
  if (params.orderType === 'delivery' && !params.deliveryLocation) {
    return 'Selecciona tu ubicación de entrega en el mapa.';
  }
  return null;
}

async function uploadProofIfNeeded(
  paymentMethod: CheckoutPaymentMethod,
  file: File | null,
): Promise<string | null> {
  if (paymentMethod !== 'pago_movil' || !file) return null;
  const proofToUpload = file.type.startsWith('image/')
    ? (await compressImage(file)).blob
    : file;
  return uploadPaymentProofTemp(proofToUpload);
}

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
  const { pagoMovil } = useMerchantPagoMovil(merchantId);

  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('pago_movil');
  const [reference, setReference] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<GeoPoint | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!canCheckout) {
      setError(validationError ?? 'No se puede continuar con el pedido.');
      return;
    }
    const formError = validateCheckoutForm({
      paymentMethod,
      pagoMovil,
      reference,
      file,
      orderType,
      deliveryLocation,
    });
    if (formError) {
      setError(formError);
      return;
    }

    setIsProcessing(true);
    try {
      const proofPath = await uploadProofIfNeeded(paymentMethod, file);
      const data = await createOrder({
        merchantId: merchantId!,
        customerId: user!.id,
        orderType,
        paymentMethod,
        paymentReference: paymentMethod === 'pago_movil' ? reference.trim() : '',
        totalAmount: Number(totalAmount),
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: parseFloat(item.product.price),
        })),
        deliveryLocation: orderType === 'delivery' ? deliveryLocation : null,
        deliveryAddress:
          orderType === 'delivery' && deliveryAddress.trim() !== ''
            ? deliveryAddress.trim()
            : null,
        paymentProofUrl: proofPath,
      });

      showToast({
        variant: 'success',
        title: '¡Pedido enviado!',
        message:
          orderType === 'delivery'
            ? 'Tu pedido con entrega a domicilio fue registrado. El comercio confirmará pronto.'
            : 'Tu pedido para retiro en local fue registrado. El comercio confirmará pronto.',
      });
      clearCart();
      navigate(`/orders/${data}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el pedido.');
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
            <div className="space-y-3">
              <div>
                <label htmlFor="delivery-address" className="mb-1 block text-sm font-medium text-slate-700">
                  Dirección de entrega
                </label>
                <input
                  id="delivery-address"
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Ej. Av. Principal, Edif. Azul, Piso 2"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <LocationPicker
                initialLocation={deliveryLocation}
                onLocationChange={setDeliveryLocation}
                userLocation={null}
                autoLocate
              />
              {deliveryLocation && (
                <p className="text-xs text-slate-500" data-testid="delivery-coordinates">
                  Coordenadas: {deliveryLocation.y.toFixed(5)}, {deliveryLocation.x.toFixed(5)}
                </p>
              )}
            </div>
          </fieldset>
        )}

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-slate-700">Método de pago</legend>
          <PaymentMethodSelector
            value={paymentMethod}
            onChange={(value) => {
              setPaymentMethod(value);
              setError(null);
            }}
          />
          {paymentMethod === 'pago_movil' && (
            <PagoMovilSection
              pagoMovil={pagoMovil}
              reference={reference}
              onReferenceChange={setReference}
              file={file}
              error={error}
              isProcessing={isProcessing}
              onFileSelect={(selected) => {
                setFile(selected);
                setError(null);
              }}
            />
          )}
          {paymentMethod === 'card_pos' && (
            <PaymentNotice>
              Pagarás con tarjeta / punto de venta al recibir tu pedido (delivery)
              o en caja (retiro en local).
            </PaymentNotice>
          )}
          {paymentMethod === 'cash' && (
            <PaymentNotice>
              Pagarás en efectivo al recibir tu pedido (delivery) o en caja
              (retiro en local).
            </PaymentNotice>
          )}
        </fieldset>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth isLoading={isProcessing} disabled={isProcessing}>
          {paymentMethod === 'pago_movil'
            ? 'Confirmar y enviar comprobante'
            : 'Confirmar pedido'}
        </Button>
      </form>
    </div>
  );
}

interface PaymentMethodSelectorProps {
  value: CheckoutPaymentMethod;
  onChange: (value: CheckoutPaymentMethod) => void;
}

const PAYMENT_METHOD_OPTIONS: {
  id: CheckoutPaymentMethod;
  label: string;
  icon: typeof Smartphone;
}[] = [
  { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone },
  { id: 'card_pos', label: 'Punto de Venta', icon: CreditCard },
  { id: 'cash', label: 'Efectivo', icon: Banknote },
];

function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Método de pago">
      {PAYMENT_METHOD_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition ${
            value === id
              ? 'border-brand-red bg-brand-red/5 text-brand-red shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

function PaymentNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
      {children}
    </p>
  );
}

interface PagoMovilSectionProps {
  pagoMovil: MerchantPagoMovilInfo | null;
  reference: string;
  onReferenceChange: (value: string) => void;
  file: File | null;
  error: string | null;
  isProcessing: boolean;
  onFileSelect: (file: File | null) => void;
}

function PagoMovilSection({
  pagoMovil,
  reference,
  onReferenceChange,
  file,
  error,
  isProcessing,
  onFileSelect,
}: PagoMovilSectionProps) {
  return (
    <div className="mt-3 space-y-3">
      {pagoMovil ? (
        <dl
          className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm"
          data-testid="pago-movil-data"
        >
          <div className="flex justify-between gap-2">
            <dt className="font-medium text-indigo-900">Banco</dt>
            <dd className="text-indigo-950">{pagoMovil.bank}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <dt className="font-medium text-indigo-900">Cédula / RIF</dt>
            <dd className="text-indigo-950">{pagoMovil.idNumber}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <dt className="font-medium text-indigo-900">Teléfono</dt>
            <dd className="text-indigo-950">{pagoMovil.phone}</dd>
          </div>
        </dl>
      ) : (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          role="note"
        >
          Este comercio aún no configuró sus datos de Pago Móvil. Elige otro
          método de pago o contacta al comercio.
        </p>
      )}

      <div>
        <label htmlFor="reference" className="mb-1 block text-sm font-medium text-slate-700">
          Número de comprobante
        </label>
        <input
          id="reference"
          type="text"
          value={reference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder="Ej. 000123456789"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>

      <PaymentProofUploader
        file={file}
        error={error}
        isProcessing={isProcessing}
        onFileSelect={onFileSelect}
      />
    </div>
  );
}
