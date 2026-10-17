import { useState, type FormEvent, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PaymentProofUploader } from '../components/cart/PaymentProofUploader';
import { PayerIdentityFields } from '../components/cart/PayerIdentityFields';
import { PayerVerificationModal } from '../components/cart/PayerVerificationModal';
import { OrderTicket } from '../components/cart/OrderTicket';
import type { MerchantIssuerInfo } from '../components/cart/OrderTicket';
import { IncompleteProfileOrderModal } from '../components/cart/IncompleteProfileOrderModal';
import { ItemModificationsAccordion } from '../components/cart/ItemModificationsAccordion';
import { LocationPicker } from '../components/map/LocationPicker';
import { TermsAcceptanceCheckbox } from '../components/legal/TermsAcceptanceCheckbox';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useMerchantPagoMovil } from '../hooks/useMerchantPagoMovil';
import { useBCVRate } from '../hooks/useExchangeRate';
import { formatBCVRate } from '../services/exchangeRate';
import { compressImage, looksLikeImageFile } from '../utils/imageCompressor';
import { formatVES } from '../utils/format';
import {
  calculateOrderTotal,
  isDeliveryAvailable,
  resolveDeliveryFee,
  type MerchantDeliveryPolicy,
} from '../utils/deliveryPolicy';
import { summarizeCartPricing } from '../utils/cartPricing';
import { isSamePayerIdentity, validatePayerIdentity } from '../utils/payerIdentity';
import {
  isOrderTypeLockedByMode,
  readServiceMode,
  resolveOrderTypeForMode,
  type ServiceMode,
} from '../utils/serviceMode';
import type { GeoPoint, OrderType, PaymentMethod } from '../types/database';
import type { MerchantPagoMovilInfo } from '../services/merchantPaymentService';
import { createOrder, isNetworkUploadError, uploadPaymentProofTemp, type PayerIdentity } from '../services/checkoutService';
import { supabase, TABLE_NAMES } from '../services/supabase';
import { isMerchantOpenNow } from '../utils/dateUtils';
import { haversineDistance } from '../utils/distance';
import { parseGeoPoint } from '../utils/geoPoint';
import { getMissingProfileFields, isProfileIncomplete } from '../utils/profileUtils';
import { buildOrderItems, itemsWithCustomizableIngredients } from '../utils/orderItems';
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

/** Traduce los mensajes de error de Supabase Storage a textos accionables. */
function toFriendlyUploadError(message: string): string {
  if (message.includes('row-level security') || message.includes('policy') || message.includes('permission')) {
    return 'No se pudo subir el comprobante: permisos de almacenamiento insuficientes. Contacta al administrador.';
  }
  if (message.includes('size') || message.includes('payload') || message.includes('413')) {
    return 'El archivo es demasiado grande para subir. Máximo 5 MB.';
  }
  return `Error al subir el comprobante: ${message}`;
}

async function uploadProofIfNeeded(
  paymentMethod: CheckoutPaymentMethod,
  file: File | null,
): Promise<string | null> {
  if (paymentMethod !== 'pago_movil' || !file) return null;

  try {
    // Los archivos elegidos desde la galería nativa traen MIME correcto, pero
    // los que provienen de gestores tipo Google Drive pueden llegar con el
    // MIME vacío: se detectan por extensión para que también se compriman y
    // la subida no muera con archivos de varios MB ("Failed to fetch").
    const proofToUpload = looksLikeImageFile(file)
      ? (await compressImage(file)).blob
      : file;
    const url = await uploadPaymentProofTemp(proofToUpload);
    if (!url) throw new Error('No se recibió URL de almacenamiento');
    return url;
  } catch (uploadError) {
    if (isNetworkUploadError(uploadError)) {
      throw new Error(
        'No se pudo conectar con el servidor para subir el comprobante. Revisa tu conexión a internet e inténtalo de nuevo.',
      );
    }
    const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
    throw new Error(toFriendlyUploadError(message));
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
    toggleExcludedIngredient,
    updateItemNotes,
  } = useCart();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { pagoMovil } = useMerchantPagoMovil(merchantId);
  const bcvRate = useBCVRate();

  const [isOpenNow, setIsOpenNow] = useState(true);
  const [openingTimeStr, setOpeningTimeStr] = useState('');
  const [closingTimeStr, setClosingTimeStr] = useState('');
  const [merchantLocation, setMerchantLocation] = useState<GeoPoint | null>(null);
  const [deliveryPolicy, setDeliveryPolicy] = useState<MerchantDeliveryPolicy>({});
  /** Datos fiscales del emisor que encabezan el ticket del cliente. */
  const [merchantIssuer, setMerchantIssuer] =
    useState<MerchantIssuerInfo | null>(null);

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
      .select(
        'opening_time, closing_time, location, offers_delivery, delivery_fee, name, rif, address, phone_whatsapp',
      )
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
          setMerchantIssuer({
            name: data.name,
            rif: data.rif ?? null,
            address: data.address ?? null,
            phone: data.phone_whatsapp ?? null,
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
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  /**
   * Bloqueo estricto de perfil incompleto: sin teléfono y cédula el pedido no
   * se envía. El modal se abre apenas se detecta (al montar o al enviar) para
   * explicar el bloqueo y llevar al usuario a completar sus datos.
   */
  const profileMissingFields = useMemo(() => getMissingProfileFields(profile), [profile]);
  const isProfileBlocked = isProfileIncomplete(profile);

  /**
   * Datos del emisor de la transferencia. Solo se preguntan cuando el perfil
   * ya tiene teléfono y cédula: si falta alguno, el pedido está bloqueado igual
   * por el modal de perfil incompleto y el cliente debe resolverlo allí.
   */
  const profilePhone = profile?.phone?.trim() ?? '';
  const profileIdNumber = profile?.ci?.trim() ?? '';
  const requirePayerData = profile !== null && !isProfileBlocked;

  const [payerBank, setPayerBank] = useState('');
  const [useProfilePayerData, setUseProfilePayerData] = useState(true);
  const [customPayerPhone, setCustomPayerPhone] = useState('');
  const [customPayerIdNumber, setCustomPayerIdNumber] = useState('');
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  /** Copia de los datos que el cliente confirmó en el paso de verificación. */
  const [verifiedPayer, setVerifiedPayer] = useState<PayerIdentity | null>(null);

  /** Combina el perfil con lo que el cliente haya escrito a mano. */
  const payer = useMemo<PayerIdentity>(
    () => ({
      bank: payerBank,
      phone: useProfilePayerData ? profilePhone : customPayerPhone,
      idNumber: useProfilePayerData ? profileIdNumber : customPayerIdNumber,
    }),
    [
      payerBank,
      useProfilePayerData,
      profilePhone,
      profileIdNumber,
      customPayerPhone,
      customPayerIdNumber,
    ],
  );

  const isPayerVerified = isSamePayerIdentity(verifiedPayer, payer);

  /**
   * El paso de verificación solo tiene sentido cuando el formulario llegó a
   * recoger los datos: si el perfil aún no cargó, no hay nada que confirmar y el
   * pedido sigue su curso normal.
   */
  const needsPayerVerification =
    paymentMethod === 'pago_movil' && requirePayerData && !isPayerVerified;

  /**
   * Aplica lo corregido en el modal. Editar teléfono o cédula allí significa que
   * la transferencia salió de otra línea, así que deja de copiar el perfil.
   */
  const applyPayerPatch = useCallback(
    (patch: Partial<PayerIdentity>) => {
      if (patch.bank !== undefined) setPayerBank(patch.bank);
      const editsIdentity =
        (patch.phone !== undefined && patch.phone !== payer.phone) ||
        (patch.idNumber !== undefined && patch.idNumber !== payer.idNumber);
      if (!editsIdentity) return;
      setUseProfilePayerData(false);
      if (patch.phone !== undefined) setCustomPayerPhone(patch.phone);
      if (patch.idNumber !== undefined) setCustomPayerIdNumber(patch.idNumber);
    },
    [payer.phone, payer.idNumber],
  );

  useEffect(() => {
    if (isProfileBlocked) {
      setProfileModalOpen(true);
    }
  }, [isProfileBlocked]);

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
  // el tipo de despacho, y el total se recalcula sin recargar nada. El
  // subtotal ya viene con el descuento aplicado (`totalAmount` del carrito);
  // el desglose se calcula aparte para mostrar el ahorro en el ticket.
  const cartTotals = useMemo(() => summarizeCartPricing(items), [items]);
  const subtotal = Number(totalAmount);
  const deliveryFee = useMemo(
    () => resolveDeliveryFee(deliveryPolicy, orderType),
    [deliveryPolicy, orderType],
  );
  const orderTotal = useMemo(
    () => calculateOrderTotal(subtotal, deliveryFee),
    [subtotal, deliveryFee],
  );

  /** Sube el comprobante y registra la orden, devolviendo su id. */
  const recordOrder = async (customerId: string, targetMerchantId: string) => {
    const proofPath = await uploadProofIfNeeded(paymentMethod, file);
    return createOrder({
      merchantId: targetMerchantId,
      customerId,
      orderType,
      paymentMethod,
      paymentReference: paymentMethod === 'pago_movil' ? reference.trim() : '',
      totalAmount: orderTotal,
      deliveryFee,
      items: buildOrderItems(items),
      deliveryLocation: orderType === 'delivery' ? deliveryLocation : null,
      deliveryAddress:
        orderType === 'delivery' && deliveryAddress.trim() !== ''
          ? deliveryAddress.trim()
          : null,
      paymentProofUrl: proofPath,
      payer,
    });
  };

  const announceOrderPlaced = (data: string) => {
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
  };

  /** Sube el comprobante y registra la orden. Solo se llega aquí tras verificar. */
  const placeOrder = async (customerId: string, targetMerchantId: string) => {
    setIsProcessing(true);
    try {
      announceOrderPlaced(await recordOrder(customerId, targetMerchantId));
    } catch (err) {
      console.error('[Checkout] error during submit:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al enviar el pedido.';
      setError(errMsg);
      showToast({ variant: 'error', title: 'Error', message: errMsg });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Tramo final: pasa por la verificación obligatoria de los datos de emisión y,
   * si cuadran, manda la orden. Un fallo aquí deja el comprobante sin enviar.
   */
  const confirmAndPlaceOrder = async (customerId: string, targetMerchantId: string) => {
    if (needsPayerVerification) {
      setIsVerificationOpen(true);
      return;
    }
    if (requirePayerData) {
      const payerError = validatePayerIdentity(payer);
      if (payerError) {
        setError(payerError);
        return;
      }
    }
    await placeOrder(customerId, targetMerchantId);
  };

  /** Sesión y comercio: sin ambos no hay ni un pedido que registrar. */
  const requireCheckoutSession = useCallback(() => {
    if (!user?.id) {
      const message = 'Debes iniciar sesión para realizar un pedido.';
      setError(message);
      showToast({ variant: 'error', title: 'Sesión requerida', message });
      return null;
    }
    if (!merchantId) {
      const message = 'No se pudo identificar el comercio. Intenta recargar la página.';
      setError(message);
      showToast({ variant: 'error', title: 'Error', message });
      return null;
    }
    return { customerId: user.id, targetMerchantId: merchantId };
  }, [user?.id, merchantId, showToast]);

  /**
   * Cobertura de entrega: el comercio solo atiende su zona. Un punto de entrega
   * demasiado lejos no se puede registrar y hay que avisarlo con el mapa abierto.
   */
  const getDeliveryCoverageError = useCallback(() => {
    if (orderType !== 'delivery' || !deliveryLocation || !merchantLocation) return null;
    const MAX_DELIVERY_RADIUS_KM = 1;
    const distanceKm = haversineDistance(deliveryLocation, merchantLocation).km;
    if (distanceKm <= MAX_DELIVERY_RADIUS_KM) return null;
    return 'Este comercio se encuentra a más de 1 km de tu ubicación actual y no ofrece cobertura a tu zona.';
  }, [orderType, deliveryLocation, merchantLocation]);

  /** Error de los campos del propio formulario, o `null` si todo cuadra. */
  const getFormError = useCallback(() => {
    if (!canCheckout) return validationError ?? 'No se puede continuar con el pedido.';
    return validateCheckoutForm({
      paymentMethod,
      pagoMovil,
      reference,
      file,
      orderType,
      deliveryLocation,
      merchantAcceptsDelivery,
    });
  }, [
    canCheckout,
    validationError,
    paymentMethod,
    pagoMovil,
    reference,
    file,
    orderType,
    deliveryLocation,
    merchantAcceptsDelivery,
  ]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDeliveryCoverageError(null);

    if (isProfileBlocked) {
      // Bloqueo estricto: ningún pedido sale sin el perfil completo.
      setProfileModalOpen(true);
      return;
    }

    const formError = getFormError();
    if (formError) {
      setError(formError);
      return;
    }

    const coverageError = getDeliveryCoverageError();
    if (coverageError) {
      setDeliveryCoverageError(coverageError);
      setError(coverageError);
      setOutOfRange(true);
      return;
    }
    setOutOfRange(false);

    const session = requireCheckoutSession();
    if (!session) return;

    await confirmAndPlaceOrder(session.customerId, session.targetMerchantId);
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
        subtotal={cartTotals.originalTotal}
        deliveryFee={deliveryFee}
        orderType={orderType}
        bcvRate={bcvRate}
        total={orderTotal}
        discountAmount={cartTotals.discountAmount}
        discountPercentage={cartTotals.discountPercentage}
        merchant={merchantIssuer}
      />

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {itemsWithCustomizableIngredients(items).map((item) => (
          <ItemModificationsAccordion
            key={item.product.id}
            productId={item.product.id}
            productTitle={item.product.title}
            ingredients={item.product.ingredients ?? []}
            excludedIngredients={item.excludedIngredients ?? []}
            notes={item.notes ?? ''}
            onToggleIngredient={toggleExcludedIngredient}
            onNotesChange={updateItemNotes}
          />
        ))}

        {!isDispatchLocked && (
          <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-slate-700">
              <i className="fa-solid fa-bicycle text-base text-brand-red" aria-hidden="true" />
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
                  <i className="fa-solid fa-bicycle text-base" aria-hidden="true" />
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
                  <i className="fa-solid fa-store text-base" aria-hidden="true" />
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
              <i className="fa-solid fa-location-dot text-base text-brand-red" aria-hidden="true" />
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
                  <i className="fa-solid fa-circle-exclamation text-base flex-shrink-0" aria-hidden="true" />
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
            <i className="fa-solid fa-credit-card text-base text-brand-red" aria-hidden="true" />
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
              showPayerData={requirePayerData}
              payer={payer}
              useProfilePayerData={useProfilePayerData}
              onToggleProfilePayerData={setUseProfilePayerData}
              onPayerBankChange={setPayerBank}
              onPayerPhoneChange={setCustomPayerPhone}
              onPayerIdNumberChange={setCustomPayerIdNumber}
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

      <PayerVerificationModal
        isOpen={isVerificationOpen}
        payer={payer}
        onChange={applyPayerPatch}
        isProcessing={isProcessing}
        onConfirm={() => {
          setVerifiedPayer(payer);
          setIsVerificationOpen(false);
          void placeOrder(user?.id ?? '', merchantId ?? '');
        }}
      />

      <IncompleteProfileOrderModal
        isOpen={profileModalOpen}
        missingFields={profileMissingFields}
        onGoToProfile={() => {
          setProfileModalOpen(false);
          navigate('/profile');
        }}
        onClose={() => setProfileModalOpen(false)}
      />
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
  icon: string;
}[] = [
  { id: 'card_pos', label: 'Tarjeta', icon: 'fa-solid fa-credit-card text-xl' },
  { id: 'cash', label: 'Efectivo', icon: 'fa-solid fa-money-bill text-xl' },
  { id: 'pago_movil', label: 'Pago Móvil', icon: 'fa-solid fa-mobile-screen text-xl' },
];

function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Métodos de pago">
      {PAYMENT_METHOD_OPTIONS.map(({ id, label, icon }) => (
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
          <i className={icon} aria-hidden="true" />
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
  /** `true` cuando el perfil tiene teléfono y cédula y se pueden precargar. */
  showPayerData: boolean;
  payer: PayerIdentity;
  useProfilePayerData: boolean;
  onToggleProfilePayerData: (value: boolean) => void;
  onPayerBankChange: (value: string) => void;
  onPayerPhoneChange: (value: string) => void;
  onPayerIdNumberChange: (value: string) => void;
}

/**
 * Datos del emisor: banco emisor, teléfono y cédula / RIF.
 *
 * El caso normal es que el cliente pague desde su propio perfil, así que se
 * ofrecen precargados y de solo lectura. Quien paga desde otra línea desmarca
 * la casilla y los campos quedan editables.
 */
function PayerDataFields({
  payer,
  useProfileData,
  onToggleProfileData,
  onBankChange,
  onPhoneChange,
  onIdNumberChange,
}: {
  payer: PayerIdentity;
  useProfileData: boolean;
  onToggleProfileData: (value: boolean) => void;
  onBankChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onIdNumberChange: (value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <fieldset
      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
      data-testid="pago-movil-payer"
    >
      <legend className="px-1 text-sm font-semibold text-slate-700">Datos de quien paga</legend>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
      >
        {isExpanded ? 'Ocultar datos' : 'Editar datos'}
      </button>
      {isExpanded && (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <input
              id="payer-use-profile"
              type="checkbox"
              checked={useProfileData}
              onChange={(event) => onToggleProfileData(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
            />
            <label htmlFor="payer-use-profile" className="text-xs leading-relaxed text-slate-600">
              Usar el teléfono y la cédula de mi perfil. Desmarca si pagas desde otra
              cuenta o línea.
            </label>
          </div>

          <PayerIdentityFields
            payer={payer}
            onBankChange={onBankChange}
            onPhoneChange={onPhoneChange}
            onIdNumberChange={onIdNumberChange}
            readOnlyPhoneAndId={useProfileData}
          />
        </div>
      )}
    </fieldset>
  );
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
  showPayerData,
  payer,
  useProfilePayerData,
  onToggleProfilePayerData,
  onPayerBankChange,
  onPayerPhoneChange,
  onPayerIdNumberChange,
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
            <dt className="font-medium text-indigo-900">Banco receptor</dt>
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
          Monto exacto a transferir: {formatVES(totalVES)} (Tasa BCV: Bs. {formatBCVRate(bcvRate)})
        </div>
      )}

      {showPayerData && (
        <PayerDataFields
          payer={payer}
          useProfileData={useProfilePayerData}
          onToggleProfileData={onToggleProfilePayerData}
          onBankChange={onPayerBankChange}
          onPhoneChange={onPayerPhoneChange}
          onIdNumberChange={onPayerIdNumberChange}
        />
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
