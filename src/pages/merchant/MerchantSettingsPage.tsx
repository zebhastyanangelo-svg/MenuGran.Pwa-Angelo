import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMerchantSettings } from '../../hooks/useMerchantSettings';
import { useToast } from '../../hooks/useToast';
import { uploadToImgBB } from '../../services/imgbb';
import type { ImageFieldState } from '../../components/merchant/ImageUploadField';
import { ImageUploadField } from '../../components/merchant/ImageUploadField';
import { LocationSettingsForm } from '../../components/merchant/LocationSettingsForm';
import { formatGeoPointOrNull } from '../../utils/distance';
import { formatUSD } from '../../utils/format';
import { parseGeoPoint } from '../../utils/geoPoint';
import { NoMerchantWarning } from '../../components/merchant/NoMerchantWarning';
import { MerchantQrPanel } from '../../components/merchant/MerchantQrPanel';
import { ProductPromoPicker } from '../../components/merchant/ProductPromoPicker';
import { WeeklyHoursEditor } from '../../components/merchant/WeeklyHoursEditor';
import { createDefaultWeeklyHours, parseWeeklyHours, summarizeWeeklyHours } from '../../utils/weeklyHours';
import {
  MAX_DELIVERY_FEE,
  MIN_DELIVERY_FEE,
  isDeliveryFeeInputInvalid,
  parseDeliveryFee,
} from '../../utils/deliveryPolicy';
import {
  MAX_BADGE_LABEL_LENGTH,
  MAX_DISCOUNT_PERCENTAGE,
  MAX_ESTIMATED_MINUTES,
  MIN_DISCOUNT_PERCENTAGE,
  PROMO_LABEL_SUGGESTIONS,
  formatDiscountBadge,
  formatEstimatedDeliveryRange,
  isDiscountPercentageInputInvalid,
  isEstimatedMinutesInputInvalid,
  parseBadgeLabel,
  parseDiscountPercentage,
  parseEstimatedMinutes,
} from '../../utils/promos';
import type {
  GeoPoint,
  MerchantCategory,
  MerchantUpdate,
  WeeklyHours,
} from '../../types/database';

const MERCHANT_CATEGORIES: MerchantCategory[] = [
  'Comida rápida',
  'Restaurante',
  'Bebidas',
  'Postres',
  'Repostería',
  'Bodegón',
  'Otro',
];

type SettingsTab = 'general' | 'location' | 'identity' | 'delivery' | 'payments' | 'qr' | 'promos';

/** Bancos frecuentes para Pago Móvil (orientativo; el campo admite texto libre). */
const PAGO_MOVIL_BANKS: readonly string[] = [
  'Banco de Venezuela',
  'Banesco',
  'Mercantil',
  'Provincial',
  'BOD',
  'BNC',
  'Bancrecer',
  'Banplus',
  'Banco del Tesoro',
  'Sofitasa',
];

function initialImageField(): ImageFieldState {
  return { url: null, uploading: false, error: null };
}

export interface MerchantSettingsPageProps {
  merchantId?: string;
}

export function MerchantSettingsPage({ merchantId }: MerchantSettingsPageProps) {
  const { user, isLoading: authLoading } = useAuth();
  const effectiveUserId = merchantId ?? user?.id;
  const { merchant, isLoading, error, saveSettings } =
    useMerchantSettings(effectiveUserId);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [name, setName] = useState('');
  const [rif, setRif] = useState('');
  const [category, setCategory] = useState<MerchantCategory>('Otro');
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState('');
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [logo, setLogo] = useState<ImageFieldState>(initialImageField);
  const [banner, setBanner] = useState<ImageFieldState>(initialImageField);
  const [pagoMovilBank, setPagoMovilBank] = useState('');
  const [pagoMovilIdNumber, setPagoMovilIdNumber] = useState('');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(() => createDefaultWeeklyHours());
  const [promoLabel, setPromoLabel] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [estimatedInput, setEstimatedInput] = useState('');
  const [offersDelivery, setOffersDelivery] = useState(true);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (merchant) {
      setName(merchant.name);
      setRif(merchant.rif);
      setCategory(merchant.category);
      setAddress(merchant.address);
      setZone(merchant.zone ?? '');
      // Parseo defensivo: el backend puede devolver POINT, WKB, objeto o null.
      setLocation(parseGeoPoint(merchant.location));
      setLogo({ url: merchant.logo_url ?? null, uploading: false, error: null });
      setBanner({ url: merchant.banner_url ?? null, uploading: false, error: null });
      setIsActive(merchant.is_active);
      setPagoMovilBank(merchant.pago_movil_bank ?? '');
      setPagoMovilIdNumber(merchant.pago_movil_id_number ?? '');
      setPagoMovilPhone(merchant.pago_movil_phone ?? '');
      setWeeklyHours(parseWeeklyHours(merchant.weekly_hours));
      setPromoLabel(merchant.promo_label ?? '');
      setDiscountInput(
        merchant.discount_percentage != null
          ? String(merchant.discount_percentage)
          : '',
      );
      setEstimatedInput(
        merchant.estimated_delivery_minutes != null
          ? String(merchant.estimated_delivery_minutes)
          : '',
      );
      setOffersDelivery(merchant.offers_delivery !== false);
      setDeliveryFeeInput(
        merchant.delivery_fee != null && Number(merchant.delivery_fee) > 0
          ? String(merchant.delivery_fee)
          : '',
      );
    }
  }, [merchant]);

  /**
   * Valida los campos de promoción sobre el texto crudo del input: los
   * parsers normalizan a `null` lo inválido, y sin esta comprobación un valor
   * fuera de rango se descartaría en silencio al guardar.
   */
  const collectPromoErrors = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (promoLabel.trim().length > MAX_BADGE_LABEL_LENGTH) {
      errors.promo_label = `La etiqueta no puede superar ${MAX_BADGE_LABEL_LENGTH} caracteres.`;
    }
    if (isDiscountPercentageInputInvalid(discountInput)) {
      errors.discount_percentage = `El descuento debe estar entre ${MIN_DISCOUNT_PERCENTAGE} y ${MAX_DISCOUNT_PERCENTAGE}%.`;
    }
    if (isEstimatedMinutesInputInvalid(estimatedInput)) {
      errors.estimated_delivery_minutes = `El tiempo debe estar entre 1 y ${MAX_ESTIMATED_MINUTES} minutos.`;
    }
    // La tarifa solo se valida si el comercio ofrece delivery: con el delivery
    // desactivado el campo está oculto y su valor no debe bloquear el guardado.
    if (offersDelivery && isDeliveryFeeInputInvalid(deliveryFeeInput)) {
      errors.delivery_fee = `El costo de envío debe estar entre ${MIN_DELIVERY_FEE} y ${MAX_DELIVERY_FEE} USD.`;
    }

    return errors;
  }, [promoLabel, discountInput, estimatedInput, offersDelivery, deliveryFeeInput]);

  const handleImageChange = async (
    e: ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'banner',
  ) => {
    const file = e.target.files?.[0];
    const setter = field === 'logo' ? setLogo : setBanner;
    if (!file) return;

    setter((prev) => ({ ...prev, uploading: true, error: null }));
    try {
      const url = await uploadToImgBB(file);
      setter({ url, uploading: false, error: null });
    } catch (err: unknown) {
      setter({
        url: null,
        uploading: false,
        error: err instanceof Error ? err.message : 'Error al subir la imagen.',
      });
    }
  };

  const clearImage = (field: 'logo' | 'banner') => {
    const setter = field === 'logo' ? setLogo : setBanner;
    setter(initialImageField());
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleImageChange(e, 'logo');
  };

  const handleBannerChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleImageChange(e, 'banner');
  };

  const clearLogo = () => clearImage('logo');
  const clearBanner = () => clearImage('banner');

  /**
   * Guarda un token nuevo de QR. Vive fuera de `handleSave` porque rotar el
   * código debe ser inmediato y no depender del resto del formulario: si el
   * comercio tiene un cambio sin guardar en otra pestaña, no debe perderlo.
   */
  const persistQrToken = async (token: string): Promise<void> => {
    await saveSettings({ qr_token: token });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    const anyUploading = logo.uploading || banner.uploading;
    if (anyUploading) return;

    const promoErrors = collectPromoErrors();
    if (Object.keys(promoErrors).length > 0) {
      setFormErrors(promoErrors);
      const failedTab: SettingsTab =
        'delivery_fee' in promoErrors ? 'delivery' : 'promos';
      setActiveTab(failedTab);
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      const updates: MerchantUpdate = {
        name: name.trim(),
        rif: rif.trim(),
        category,
        address: address.trim(),
        zone: zone.trim() || null,
        location: formatGeoPointOrNull(location),
        logo_url: logo.url,
        banner_url: banner.url,
        is_active: isActive,
        pago_movil_bank: pagoMovilBank.trim() || null,
        pago_movil_id_number: pagoMovilIdNumber.trim() || null,
        pago_movil_phone: pagoMovilPhone.trim() || null,
        promo_label: parseBadgeLabel(promoLabel),
        discount_percentage: parseDiscountPercentage(discountInput),
        estimated_delivery_minutes: parseEstimatedMinutes(estimatedInput),
        offers_delivery: offersDelivery,
        // Con el delivery desactivado la tarifa se guarda en 0 para que no
        // quede un cobro huérfano reactivándose si el comercio lo vuelve a
        // encender más adelante.
        delivery_fee: offersDelivery ? (parseDeliveryFee(deliveryFeeInput) ?? 0) : 0,
        // `opening_time`/`closing_time` se derivan de la agenda semanal para que las
        // vistas que aún leen esas columnas sigan mostrando un rango coherente.
        ...summarizeWeeklyHours(weeklyHours),
        weekly_hours: weeklyHours,
      };

      await saveSettings(updates);
      showToast({
        title:
          location !== null
            ? 'Ubicación actualizada correctamente'
            : 'Configuración guardada',
        message: 'Los cambios se han guardado correctamente.',
        variant: 'success',
      });
    } catch (err: unknown) {
      showToast({
        title: 'Error al guardar',
        message: err instanceof Error ? err.message : 'No se pudieron guardar los cambios.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const tabClass = (tab: SettingsTab) =>
    `shrink-0 snap-start whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  if (authLoading || isLoading) {
    return (
      <div className="py-8 text-center text-gray-500 font-medium" role="status">
        Cargando configuración...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 bg-red-50 border border-red-200 rounded text-red-700"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!merchant) {
    return <NoMerchantWarning />;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Configuración del Comercio
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Administra los datos, la ubicación y la identidad visual de tu negocio.
            </p>
          </div>
          <a
            href={`/merchant/${merchant.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-red"
          >
            Vista Previa
          </a>
        </div>
      </header>

      {/*
        Siete secciones no caben en el ancho de un móvil. El contenedor conserva
        la tarjeta blanca y el desplazamiento horizontal ocurre dentro de él, en
        una sola línea: `overflow-x-auto` mantiene rueda, táctil y teclado,
        `no-scrollbar` solo oculta la barra visual y `snap-x` ancla cada
        pestaña al empezar, para que ninguna etiqueta se corte ni se salga de
        los márgenes de la pantalla.
      */}
      <div className="mb-6 rounded-lg bg-white p-1 shadow-sm">
        <nav
          className="no-scrollbar flex snap-x gap-2 overflow-x-auto"
          aria-label="Secciones de configuración"
        >
          <button
            type="button"
            className={tabClass('general')}
            onClick={() => setActiveTab('general')}
            aria-pressed={activeTab === 'general'}
          >
            Datos Generales
          </button>
          <button
            type="button"
            className={tabClass('location')}
            onClick={() => setActiveTab('location')}
            aria-pressed={activeTab === 'location'}
          >
            Ubicación
          </button>
          <button
            type="button"
            className={tabClass('identity')}
            onClick={() => setActiveTab('identity')}
            aria-pressed={activeTab === 'identity'}
          >
            Horarios e Identidad
          </button>
          <button
            type="button"
            className={tabClass('delivery')}
            onClick={() => setActiveTab('delivery')}
            aria-pressed={activeTab === 'delivery'}
          >
            Delivery
          </button>
          <button
            type="button"
            className={tabClass('payments')}
            onClick={() => setActiveTab('payments')}
            aria-pressed={activeTab === 'payments'}
          >
            Pago Móvil
          </button>
          <button
            type="button"
            className={tabClass('qr')}
            onClick={() => setActiveTab('qr')}
            aria-pressed={activeTab === 'qr'}
          >
            Código QR
          </button>
          <button
            type="button"
            className={tabClass('promos')}
            onClick={() => setActiveTab('promos')}
            aria-pressed={activeTab === 'promos'}
          >
            Promociones
          </button>
        </nav>
      </div>

      <form onSubmit={handleSave} className="space-y-5" noValidate>
        {activeTab === 'general' && (
          <GeneralTab
            name={name}
            onNameChange={setName}
            rif={rif}
            onRifChange={setRif}
            category={category}
            onCategoryChange={setCategory}
          />
        )}

        {activeTab === 'location' && (
          <LocationSettingsForm
            location={location}
            onLocationChange={setLocation}
            address={address}
            onAddressChange={setAddress}
            zone={zone}
            onZoneChange={setZone}
          />
        )}

        {activeTab === 'identity' && (
          <IdentityTab
            logo={logo}
            onLogoChange={handleLogoChange}
            onLogoRemove={clearLogo}
            banner={banner}
            onBannerChange={handleBannerChange}
            onBannerRemove={clearBanner}
            isActive={isActive}
            onIsActiveChange={setIsActive}
            weeklyHours={weeklyHours}
            onWeeklyHoursChange={setWeeklyHours}
          />
        )}

        {activeTab === 'qr' && (
          <MerchantQrPanel
            merchant={merchant}
            onPersistToken={persistQrToken}
          />
        )}

        {activeTab === 'delivery' && (
          <DeliveryTab
            offersDelivery={offersDelivery}
            onOffersDeliveryChange={setOffersDelivery}
            feeInput={deliveryFeeInput}
            onFeeInputChange={setDeliveryFeeInput}
            error={formErrors.delivery_fee}
          />
        )}

        {activeTab === 'payments' && (
          <PagoMovilTab
            bank={pagoMovilBank}
            onBankChange={setPagoMovilBank}
            idNumber={pagoMovilIdNumber}
            onIdNumberChange={setPagoMovilIdNumber}
            phone={pagoMovilPhone}
            onPhoneChange={setPagoMovilPhone}
          />
        )}

        {activeTab === 'promos' && (
          <PromosTab
            merchantId={merchant.id}
            promoLabel={promoLabel}
            onPromoLabelChange={setPromoLabel}
            discountInput={discountInput}
            onDiscountInputChange={setDiscountInput}
            estimatedInput={estimatedInput}
            onEstimatedInputChange={setEstimatedInput}
            errors={formErrors}
          />
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <button
            type="submit"
            disabled={saving || logo.uploading || banner.uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface GeneralTabProps {
  name: string;
  onNameChange: (value: string) => void;
  rif: string;
  onRifChange: (value: string) => void;
  category: MerchantCategory;
  onCategoryChange: (value: MerchantCategory) => void;
}

function GeneralTab({
  name,
  onNameChange,
  rif,
  onRifChange,
  category,
  onCategoryChange,
}: GeneralTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="merchant-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nombre del Negocio
        </label>
        <input
          id="merchant-name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ej. Pizzería La Trattoria"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label
          htmlFor="merchant-rif"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          RIF
        </label>
        <input
          id="merchant-rif"
          type="text"
          value={rif}
          onChange={(e) => onRifChange(e.target.value)}
          placeholder="Ej. J-12345678-0"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label
          htmlFor="merchant-category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Categoría
        </label>
        <select
          id="merchant-category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as MerchantCategory)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          required
        >
          {MERCHANT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface PagoMovilTabProps {
  bank: string;
  onBankChange: (value: string) => void;
  idNumber: string;
  onIdNumberChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
}

function PagoMovilTab({
  bank,
  onBankChange,
  idNumber,
  onIdNumberChange,
  phone,
  onPhoneChange,
}: PagoMovilTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
        Estos datos se muestran al cliente en el checkout cuando elige pagar con Pago Móvil.
      </p>
      <div>
        <label
          htmlFor="pago-movil-bank"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Banco
        </label>
        <input
          id="pago-movil-bank"
          type="text"
          list="pago-movil-banks"
          value={bank}
          onChange={(e) => onBankChange(e.target.value)}
          placeholder="Ej. Banesco"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <datalist id="pago-movil-banks">
          {PAGO_MOVIL_BANKS.map((bankName) => (
            <option key={bankName} value={bankName} />
          ))}
        </datalist>
      </div>
      <div>
        <label
          htmlFor="pago-movil-id-number"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Cédula / RIF
        </label>
        <input
          id="pago-movil-id-number"
          type="text"
          value={idNumber}
          onChange={(e) => onIdNumberChange(e.target.value)}
          placeholder="Ej. J-123456789"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="pago-movil-phone"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Teléfono para Pago Móvil
        </label>
        <input
          id="pago-movil-phone"
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="Ej. 0412-1234567"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

interface IdentityTabProps {
  logo: ImageFieldState;
  onLogoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onLogoRemove: () => void;
  banner: ImageFieldState;
  onBannerChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBannerRemove: () => void;
  isActive: boolean;
  onIsActiveChange: (value: boolean) => void;
  weeklyHours: WeeklyHours;
  onWeeklyHoursChange: (next: WeeklyHours) => void;
}

function IdentityTab({
  logo,
  onLogoChange,
  onLogoRemove,
  banner,
  onBannerChange,
  onBannerRemove,
  isActive,
  onIsActiveChange,
  weeklyHours,
  onWeeklyHoursChange,
}: IdentityTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Logo
        </label>
        <ImageUploadField
          label="Logo"
          fieldName="logo"
          value={logo}
          onFileChange={onLogoChange}
          onRemove={onLogoRemove}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Banner
        </label>
        <ImageUploadField
          label="Banner"
          fieldName="banner"
          value={banner}
          onFileChange={onBannerChange}
          onRemove={onBannerRemove}
        />
      </div>

      <WeeklyHoursEditor weeklyHours={weeklyHours} onChange={onWeeklyHoursChange} />

      <div className="flex items-center gap-3">
        <input
          id="merchant-is-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => onIsActiveChange(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label
          htmlFor="merchant-is-active"
          className="text-sm font-medium text-gray-700"
        >
          Comercio activo
        </label>
      </div>
    </div>
  );
}

interface PromosTabProps {
  /** Comercio dueño del menú: sus platos son los seleccionables. */
  merchantId: string;
  promoLabel: string;
  onPromoLabelChange: (value: string) => void;
  discountInput: string;
  onDiscountInputChange: (value: string) => void;
  estimatedInput: string;
  onEstimatedInputChange: (value: string) => void;
  errors: Record<string, string>;
}

interface DeliveryTabProps {
  offersDelivery: boolean;
  onOffersDeliveryChange: (value: boolean) => void;
  feeInput: string;
  onFeeInputChange: (value: string) => void;
  error?: string;
}

/**
 * Política de envío: si el comercio entrega a domicilio y, cuando entrega, si
 * el envío es gratis o tiene costo.
 *
 * Desactivar el delivery tiene un efecto visible más allá del formulario: el
 * marketplace oculta el comercio para los clientes en flujo de delivery y el
 * checkout fuerza el retiro en local. El texto lo dice para que la decisión no
 * se tome a ciegas.
 */
function DeliveryTab({
  offersDelivery,
  onOffersDeliveryChange,
  feeInput,
  onFeeInputChange,
  error,
}: DeliveryTabProps) {
  const fee = parseDeliveryFee(feeInput);
  const isFree = fee !== null && fee === 0;

  return (
    <div className="space-y-5">
      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">
          Entrega a domicilio
        </legend>

        <label className="flex items-start gap-3" htmlFor="merchant-offers-delivery">
          <input
            id="merchant-offers-delivery"
            type="checkbox"
            checked={offersDelivery}
            onChange={(e) => onOffersDeliveryChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            <span className="block text-sm font-medium text-gray-700">
              Ofrezco delivery a domicilio
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Si lo desactivas, tu comercio deja de aparecer para los clientes
              que pidieron delivery y el checkout solo permitirá retiro en el
              local.
            </span>
          </span>
        </label>
      </fieldset>

      {offersDelivery && (
        <div>
          <label
            htmlFor="merchant-delivery-fee"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Costo del envío (USD)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="merchant-delivery-fee"
              type="number"
              inputMode="decimal"
              min={MIN_DELIVERY_FEE}
              max={MAX_DELIVERY_FEE}
              step="0.01"
              value={feeInput}
              onChange={(e) => onFeeInputChange(e.target.value)}
              placeholder="0.00"
              aria-describedby="merchant-delivery-fee-help"
              className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <span
              className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
              data-testid="merchant-delivery-fee-preview"
            >
              {isFree || fee === null ? 'Envío gratis' : `${formatUSD(fee)} envío`}
            </span>
          </div>
          <p id="merchant-delivery-fee-help" className="mt-1 text-xs text-gray-500">
            Déjalo vacío o en 0 para entregar gratis. El monto se suma al total
            del pedido en el checkout y se ve en la tarjeta de tu comercio.
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Señales visuales del comercio: etiqueta flotante, descuento y tiempo
 * estimado. Todo lo que se configura aquí es lo que el marketplace muestra
 * dinámicamente en la tarjeta del comercio y en la cabecera del local.
 */
function PromosTab({
  merchantId,
  promoLabel,
  onPromoLabelChange,
  discountInput,
  onDiscountInputChange,
  estimatedInput,
  onEstimatedInputChange,
  errors,
}: PromosTabProps) {
  const discountPreview = formatDiscountBadge(discountInput);
  const etaPreview = formatEstimatedDeliveryRange(estimatedInput);

  const inputClass = (hasError: boolean) =>
    `w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">
        Estas etiquetas aparecen en la tarjeta de tu comercio dentro de
        MenuGran. Déjalas vacías si no quieres mostrarlas.
      </p>

      <div>
        <label htmlFor="merchant-promo-label" className="block text-sm font-medium text-gray-700 mb-1">
          Etiqueta promocional
        </label>
        <input
          id="merchant-promo-label"
          type="text"
          list="merchant-promo-suggestions"
          value={promoLabel}
          onChange={(e) => onPromoLabelChange(e.target.value)}
          placeholder="Ej. 2x1"
          className={inputClass(Boolean(errors.promo_label))}
        />
        <datalist id="merchant-promo-suggestions">
          {PROMO_LABEL_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        {errors.promo_label && (
          <p className="mt-1 text-xs text-red-600">{errors.promo_label}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="merchant-discount" className="block text-sm font-medium text-gray-700 mb-1">
            Descuento (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="merchant-discount"
              type="number"
              min={MIN_DISCOUNT_PERCENTAGE}
              max={MAX_DISCOUNT_PERCENTAGE}
              step={1}
              value={discountInput}
              onChange={(e) => onDiscountInputChange(e.target.value)}
              placeholder="0"
              className={inputClass(Boolean(errors.discount_percentage))}
            />
            {discountPreview !== null && (
              <span
                className="shrink-0 rounded-full bg-brand-red px-2.5 py-1 text-xs font-semibold text-white"
                data-testid="merchant-discount-preview"
              >
                {discountPreview}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Vacío o 0 para no mostrar descuento.
          </p>
          {errors.discount_percentage && (
            <p className="mt-1 text-xs text-red-600">{errors.discount_percentage}</p>
          )}
        </div>

        <div>
          <label htmlFor="merchant-estimated-minutes" className="block text-sm font-medium text-gray-700 mb-1">
            Tiempo estimado de preparación (min)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="merchant-estimated-minutes"
              type="number"
              min={1}
              max={MAX_ESTIMATED_MINUTES}
              step={1}
              value={estimatedInput}
              onChange={(e) => onEstimatedInputChange(e.target.value)}
              placeholder="25"
              className={inputClass(Boolean(errors.estimated_delivery_minutes))}
            />
            {etaPreview !== null && (
              <span
                className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                data-testid="merchant-eta-preview"
              >
                {etaPreview}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Se muestra como rango junto al reloj (Ej. 25 → “25-35 min”).
          </p>
          {errors.estimated_delivery_minutes && (
            <p className="mt-1 text-xs text-red-600">
              {errors.estimated_delivery_minutes}
            </p>
          )}
        </div>
      </div>

      {/* Vincula la promoción a los platos concretos, no solo al comercio. */}
      <section aria-labelledby="promo-dishes-heading" className="border-t pt-5">
        <h3
          id="promo-dishes-heading"
          className="mb-2 text-sm font-semibold text-gray-800"
        >
          Aplicar la promoción a platos específicos
        </h3>
        <ProductPromoPicker merchantId={merchantId} />
      </section>
    </div>
  );
}
