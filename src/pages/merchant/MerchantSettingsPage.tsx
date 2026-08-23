import {
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
import type {
  GeoPoint,
  MerchantCategory,
  MerchantUpdate,
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

type SettingsTab = 'general' | 'location' | 'identity';

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
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (merchant) {
      setName(merchant.name);
      setRif(merchant.rif);
      setCategory(merchant.category);
      setAddress(merchant.address);
      setZone(merchant.zone ?? '');
      setLocation(merchant.location ?? null);
      setLogo({ url: merchant.logo_url ?? null, uploading: false, error: null });
      setBanner({ url: merchant.banner_url ?? null, uploading: false, error: null });
      setIsActive(merchant.is_active);
    }
  }, [merchant]);

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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    const anyUploading = logo.uploading || banner.uploading;
    if (anyUploading) return;

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
      };

      await saveSettings(updates);
      showToast({
        title: 'Configuración guardada',
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
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
    return (
      <div className="py-8 text-center text-gray-500 font-medium" role="status">
        No se encontró el comercio.
      </div>
    );
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

      <nav
        className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-sm"
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
      </nav>

      <form onSubmit={handleSave} className="space-y-5">
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

interface IdentityTabProps {
  logo: ImageFieldState;
  onLogoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onLogoRemove: () => void;
  banner: ImageFieldState;
  onBannerChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBannerRemove: () => void;
  isActive: boolean;
  onIsActiveChange: (value: boolean) => void;
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
