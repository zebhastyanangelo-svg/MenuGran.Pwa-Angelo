import { useState, type FormEvent, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Store,
  Bike,
  Smartphone,
  CreditCard,
  Banknote,
  AlertCircle,
  FileText,
  Receipt,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PaymentProofUploader } from '../components/cart/PaymentProofUploader';
import { OrderTicket } from '../components/cart/OrderTicket';
import { LocationPicker } from '../components/map/LocationPicker';
import { TermsAcceptanceCheckbox } from '../components/legal/TermsAcceptanceCheckbox';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useMerchantPagoMovil } from '../hooks/useMerchantPagoMovil';
import { useBCVRate } from '../hooks/useExchangeRate';
import { compressImage } from '../utils/imageCompressor';
import { formatVES } from '../utils/format';
import {
  calculateOrderTotal,
  isDeliveryAvailable,
  resolveDeliveryFee,
  type MerchantDeliveryPolicy,
} from '../utils/deliveryPolicy';
import {
  isOrderTypeLockedByMode,
  readServiceMode,
  resolveOrderTypeForMode,
  type ServiceMode,
} from '../utils/serviceMode';
import type { GeoPoint, OrderType, PaymentMethod } from '../types/database';
import type { MerchantPagoMovilInfo } from '../services/merchantPaymentService';
import { createOrder, uploadPaymentProofTemp } from '../services/checkoutService';
import { supabase, TABLE_NAMES } from '../services/supabase';
import { isMerchantOpenNow } from '../utils/dateUtils';
import { haversineDistance } from '../utils/distance';
import { parseGeoPoint } from '../utils/geoPoint';
import posthog, { isPostHogEnabled } from '../posthog';

type CheckoutPaymentMethod = Extract<PaymentMethod, 'pago_movil' | 'card_pos' | 'cash'>;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface ValidateParams {
  paymentMethod: CheckoutPaymentMethod;
  pagoMovil: MerchantPagoMovilInfo | null;
  reference: string;
  file: File | null;
  orderType: OrderType;
  deliveryLocation: GeoPoint | null;
  /** `false` si el comercio no ofrece delivery y el pedido lo exige. */
  merchantAcceptsDelivery: boolean;
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
  if (params.orderType === 'delivery') {
    if (!params.merchantAcceptsDelivery) {
      return 'Este comercio no ofrece delivery. Vuelve al marketplace y elige otro comercio.';
    }
    if (!params.deliveryLocation) {
      return 'Selecciona tu ubicación de entrega en el mapa.';
    }
  }
  return null;
}

async function uploadProofIfNeeded(
  paymentMethod: CheckoutPaymentMethod,
  file: File | null,
): Promise<string | null> {
  if (paymentMethod !== 'pago_movil' || !file) return null;

  try {
    const proofToUpload = file.type.startsWith('image/')
      ? (await compressImage(file)).blob
      : file;
    const url = await uploadPaymentProofTemp(proofToUpload);
    if (!url) throw new Error('No se recibió URL de almacenamiento');
    return url;
  } catch (uploadError) {
    const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
    // Detectar errores comunes de Supabase Storage
    if (message.includes('row-level security') || message.includes('policy') || message.includes('permission')) {
      throw new Error('No se pudo subir el comprobante: permisos de almacenamiento insuficientes. Contacta al administrador.');
    }
    if (message.includes('size') || message.includes('payload') || message.includes('413')) {
      throw new Error('El archivo es demasiado grande para subir. Máximo 5 MB.');
    }
    // Otros errores de red
    throw new Error(`Error al subir el comprobante: ${message}`);
  }
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
  const bcvRate = useBCVRate();

  const [isOpenNow, setIsOpenNow] = useState(true);
  const [openingTimeStr, setOpeningTimeStr] = useState('');
  const [closingTimeStr, setClosingTimeStr] = useState('');
  const [merchantLocation, setMerchantLocation] = useState<GeoPoint | null>(null);
  const [deliveryPolicy, setDeliveryPolicy] = useState<MerchantDeliveryPolicy>({});

  /**
   * Modo de servicio elegido en la pantalla de bienvenida. Cuando el cliente
   * ya respondió, el tipo de despacho queda fijado y el selector desaparece:
   * no se vuelve a preguntar y el checkout va directo a los métodos de pago.
   */
  const [serviceMode] = useState<ServiceMode | null>(() => readServiceMode());
  const isDispatchLocked = isOrderTypeLockedByMode(serviceMode);

  useEffect(() => {
    if (!merchantId) return;
    let cancelled = false;
    supabase
      .from(TABLE_NAMES.merchants)
      .select('opening_time, closing_time, location, offers_delivery, delivery_fee')
      .eq('id', merchantId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error fetching merchant hours', error);
          return;
        }
        if (data) {
          setOpeningTimeStr(data.opening_time ?? '');
          setClosingTimeStr(data.closing_time ?? '');
          setIsOpenNow(isMerchantOpenNow(data.opening_time, data.closing_time));
          setDeliveryPolicy({
            offers_delivery: data.offers_delivery,
            delivery_fee: data.delivery_fee,
          });
          const parsed = parseGeoPoint(data.location);
          if (parsed !== null) {
            setMerchantLocation({ x: parsed.x, y: parsed.y });
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [merchantId]);

  const merchantAcceptsDelivery = isDeliveryAvailable(deliveryPolicy);

  /**
   * Tipo de despacho. Si el cliente ya eligió modo en la pantalla de
   * bienvenida, su decisión gana y el selector queda bloqueado; si no, manda
   * el estado local.
   */
  const [manualOrderType, setManualOrderType] = useState<OrderType>(() =>
    resolveOrderTypeForMode(serviceMode) ?? 'delivery',
  );
  const requestedOrderType: OrderType = isDispatchLocked
    ? (resolveOrderTypeForMode(serviceMode) as OrderType)
    : manualOrderType;

  // Un comercio sin delivery no puede recibir un pedido a domicilio aunque el
  // cliente llegue por una URL directa: se degrada a retiro en local.
  const orderType: OrderType =
    requestedOrderType === 'delivery' && !merchantAcceptsDelivery
      ? 'pickup'
      : requestedOrderType;

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('pago_movil');
  const [reference, setReference] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<GeoPoint | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outOfRange, setOutOfRange] = useState(false);
  const [deliveryCoverageError, setDeliveryCoverageError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [customerTaxId, setCustomerTaxId] = useState('');

  const setOrderType = useCallback(
    (value: OrderType) => {
      if (value === 'delivery' && !merchantAcceptsDelivery) return;
      setManualOrderType(value);
      setOutOfRange(false);
      setDeliveryCoverageError(null);
      setError(null);
    },
    [merchantAcceptsDelivery],
  );

  // El envío se cobra en tiempo real: cambia con la tarifa del comercio y con
  // el tipo de despacho, y el total se recalcula sin recargar nada.
  const subtotal = Number(totalAmount);
  const deliveryFee = useMemo(
    () => resolveDeliveryFee(deliveryPolicy, orderType),
    [deliveryPolicy, orderType],
  );
  const orderTotal = useMemo(
    () => calculateOrderTotal(subtotal, deliveryFee),
    [subtotal, deliveryFee],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDeliveryCoverageError(null);

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
      merchantAcceptsDelivery,
    });
    if (formError) {
      setError(formError);
      return;
    }

    // Validate delivery distance coverage (1km)
    if (orderType === 'delivery' && deliveryLocation && merchantLocation) {
      const distance = haversineDistance(deliveryLocation, merchantLocation).km;
      const MAX_DELIVERY_RADIUS_KM = 1; // 1km coverage radius
      if (distance > MAX_DELIVERY_RADIUS_KM) {
        const errorMsg = `Este comercio se encuentra a más de 1 km de tu ubicación actual y no ofrece cobertura a tu zona.`;
        setDeliveryCoverageError(errorMsg);
        setError(errorMsg);
        setOutOfRange(true);
        return;
      }
    }
    setOutOfRange(false);

    // Validaciones defensivas para evitar null pointer
    if (!user?.id) {
      const errMsg = 'Debes iniciar sesión para realizar un pedido.';
      setError(errMsg);
      showToast({ variant: 'error', title: 'Sesión requerida', message: errMsg });
      return;
    }
    if (!merchantId) {
      const errMsg = 'No se pudo identificar el comercio. Intenta recargar la página.';
      setError(errMsg);
      showToast({ variant: 'error', title: 'Error', message: errMsg });
      return;
    }

    setIsProcessing(true);
    try {
      const proofPath = await uploadProofIfNeeded(paymentMethod, file);
      const data = await createOrder({
        merchantId,
        customerId: user.id,
        orderType,
        paymentMethod,
        paymentReference: paymentMethod === 'pago_movil' ? reference.trim() : '',
        totalAmount: orderTotal,
        deliveryFee,
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
        customerTaxId: customerTaxId.trim() || null,
      });

      if (isPostHogEnabled) {
        posthog.capture('order_placed', {
          order_type: orderType,
          payment_method: paymentMethod,
          item_count: totalItems,
          total_amount: orderTotal,
          delivery_fee: deliveryFee,
        });
      }

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
      console.error('[Checkout] error during submit:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al enviar el pedido.';
      setError(errMsg);
      showToast({ variant: 'error', title: 'Error', message: errMsg });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddressChange = useCallback((address: string) => {
    setDeliveryAddress(address);
  }, []);

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

  if (!isOpenNow) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">
            El comercio se encuentra cerrado. Su horario de atención es de {openingTimeStr?.slice(0,5) ?? '--:--'} a {closingTimeStr?.slice(0,5) ?? '--:--'}.
          </p>
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

      <OrderTicket
        items={items}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        orderType={orderType}
        bcvRate={bcvRate}
        total={orderTotal}
      />

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {!isDispatchLocked && (
          <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-slate-700">
              <Bike className="h-4 w-4 text-brand-red" aria-hidden="true" />
              Opciones de Despacho
            </legend>
            {merchantAcceptsDelivery ? (
              <div className="flex rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  aria-pressed={orderType === 'delivery'}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-center text-sm font-medium transition ${
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
                  className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-center text-sm font-medium transition ${
                    orderType === 'pickup'
                      ? 'bg-brand-red text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="h-4 w-4" aria-hidden="true" />
                  Retiro en local
                </button>
              </div>
            ) : (
              <p
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                role="note"
              >
                Este comercio no ofrece delivery a domicilio, así que tu pedido
                será para retiro en el local.
              </p>
            )}
          </fieldset>
        )}

        {orderType === 'delivery' && (
          <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <legend className="flex items-center gap-1 px-1 text-sm font-semibold text-slate-700">
              <MapPin className="h-4 w-4 text-brand-red" aria-hidden="true" />
              Dirección de Entrega
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
                onAddressChange={handleAddressChange}
              />
              {deliveryCoverageError && (
                <p className="flex items-center gap-2 text-sm text-red-600" role="alert">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {deliveryCoverageError}
                </p>
              )}
              {deliveryLocation && (
                <p className="text-xs text-slate-500" data-testid="delivery-coordinates">
                  Coordenadas: {deliveryLocation.y.toFixed(5)}, {deliveryLocation.x.toFixed(5)}
                </p>
              )}
            </div>
          </fieldset>
        )}

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-slate-700">
            <CreditCard className="h-4 w-4 text-brand-red" aria-hidden="true" />
            Métodos de Pago
          </legend>
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
              totalAmount={orderTotal}
              bcvRate={bcvRate}
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

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-brand-red" aria-hidden="true" />
            Comprobante Fiscal
          </legend>
          <div className="space-y-3">
            <div>
              <label htmlFor="customer-tax-id" className="mb-1 block text-sm font-medium text-slate-700">
                RIF o cédula (opcional)
              </label>
              <input
                id="customer-tax-id"
                type="text"
                value={customerTaxId}
                onChange={(e) => setCustomerTaxId(e.target.value)}
                placeholder="Ej. J-12345678-0"
                maxLength={20}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <Receipt className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
              Lo usamos solo para emitir tu comprobante. Déjalo vacío si prefieres
              recibir el pedido sin datos fiscales.
            </p>
          </div>
        </fieldset>

        <TermsAcceptanceCheckbox
          id="checkout-terms"
          checked={termsAccepted}
          onChange={setTermsAccepted}
        />

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          isLoading={isProcessing}
          disabled={isProcessing || outOfRange || !termsAccepted}
        >
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
  { id: 'card_pos', label: 'Tarjeta', icon: CreditCard },
  { id: 'cash', label: 'Efectivo', icon: Banknote },
  { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone },
];

function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Métodos de pago">
      {PAYMENT_METHOD_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
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
  totalAmount: number;
  bcvRate: number;
}

function PagoMovilSection({
  pagoMovil,
  reference,
  onReferenceChange,
  file,
  error,
  isProcessing,
  onFileSelect,
  totalAmount,
  bcvRate,
}: PagoMovilSectionProps) {
  const totalVES = bcvRate > 0 ? totalAmount * bcvRate : 0;

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

      {bcvRate > 0 && totalVES > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 font-medium">
          Monto exacto a transferir: {formatVES(totalVES)} (Tasa BCV: Bs. {bcvRate.toFixed(2)})
        </div>
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
