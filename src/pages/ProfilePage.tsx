import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProfile, type ProfileUpdatePayload } from '../hooks/useUpdateProfile';
import {
  DELIVERY_MARKETPLACE_PATH,
  clearServiceMode,
  readServiceMode,
  type ServiceMode,
} from '../utils/serviceMode';
import { supabase } from '../services/supabase';
import {
  requestPermissionAndShowTestNotification,
  type LocalNotificationStatus,
} from '../utils/localNotification';

/** Mensajes según el resultado de la notificación de prueba local. */
const TEST_NOTIFICATION_MESSAGES: Record<LocalNotificationStatus, string> = {
  granted: '¡Notificación enviada! Revisa tu dispositivo.',
  denied: 'Debes permitir las notificaciones en tu navegador para recibirlas.',
  unsupported: 'Tu navegador no soporta notificaciones.',
};

export function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { updateProfile, deleteAccount, isSaving, isDeleting, error: saveError } = useUpdateProfile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [ci, setCi] = useState(profile?.ci ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [pushSending, setPushSending] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  /**
   * Cambiar de modo de servicio desde el perfil.
   *
   * El modo se fijó al entrar y gobierna el marketplace (solo comercios con
   * delivery) y el checkout (ya no pregunta el tipo de despacho). Sin esta
   * salida el cliente quedaría atascado en su primera respuesta, así que se
   * borra la marca y se vuelve a la pantalla de elección.
   */
  const [serviceMode, setServiceMode] = useState<ServiceMode | null>(() =>
    readServiceMode(),
  );

  function handleChangeServiceMode() {
    clearServiceMode();
    setServiceMode(null);
    navigate(DELIVERY_MARKETPLACE_PATH, { replace: true });
  }

  /**
   * Dispara la notificación de prueba real en este dispositivo: solicita el
   * permiso si falta y la muestra vía Service Worker (con fallback al
   * constructor `Notification`), reutilizando la utilidad compartida.
   */
  const handleTestNotification = async () => {
    if (user === null || pushSending) return;
    setPushSending(true);
    setPushMessage(null);
    setPushError(null);

    try {
      const status = await requestPermissionAndShowTestNotification();
      if (status === 'granted') {
        setPushMessage(TEST_NOTIFICATION_MESSAGES.granted);
      } else {
        setPushError(TEST_NOTIFICATION_MESSAGES[status]);
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Error inesperado al probar la notificación.');
    } finally {
      setPushSending(false);
    }
  };

  const email = user?.email ?? profile?.email ?? 'Sin correo asociado';
  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Cliente';

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (user === null) return;
    setSuccessMsg(null);
    try {
      const payload: ProfileUpdatePayload = {};
      if (fullName !== (profile?.full_name ?? '')) payload.full_name = fullName;
      if (ci !== (profile?.ci ?? '')) payload.ci = ci;
      if (phone !== (profile?.phone ?? '')) payload.phone = phone;

      if (Object.keys(payload).length === 0) return;

      // Check CI uniqueness if changed
      if (payload.ci && payload.ci !== (profile?.ci ?? '')) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('ci', payload.ci)
          .neq('id', user.id)
          .maybeSingle();
        if (existing) {
          setSuccessMsg(null);
          // Use saveError via hook? We'll set a local error state
          // but hook captures error; we can throw
          throw new Error('Esta cédula ya está registrada por otro usuario.');
        }
      }

      await updateProfile(user.id, payload);
      setSuccessMsg('Perfil actualizado correctamente');
    } catch (err) {
      // error is captured by useUpdateProfile
      console.error('Error al guardar perfil:', err);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const openDeleteModal = () => {
    setConfirmText('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    if (confirmText !== 'ELIMINAR' || user === null) return;
    try {
      await deleteAccount(user.id);
      // clear local storage and redirect home
      localStorage.clear();
      navigate('/', { replace: true });
    } catch {
      // error handled by hook
    } finally {
      closeDeleteModal();
    }
  };

  return (
    <section className="mx-auto max-w-xl pt-4 md:pt-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
            <i className="fa-solid fa-circle-user text-4xl" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-500">
              Perfil del cliente
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
          </div>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          {/* Nombre completo */}
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <i className="fa-solid fa-circle-user text-base" aria-hidden="true" />
              Nombre completo
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              placeholder="Tu nombre completo"
            />
          </label>

          {/* Correo (solo lectura) */}
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <i className="fa-solid fa-envelope text-base" aria-hidden="true" />
              Correo electrónico
            </span>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-base font-semibold text-slate-500"
            />
          </label>

          {/* Cédula de Identidad */}
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <i className="fa-solid fa-credit-card text-base" aria-hidden="true" />
              Cédula de Identidad (C.I.)
            </span>
            <input
              type="text"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              placeholder="Ej. V-12345678"
            />
          </label>

          {/* Teléfono */}
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <i className="fa-solid fa-phone text-base" aria-hidden="true" />
              Teléfono
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              placeholder="Ej. +584121234567"
            />
          </label>

          {saveError && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              {saveError}
            </p>
          )}
          {successMsg && (
            <p role="status" className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (
              <i className="fa-solid fa-circle-notch text-xl animate-spin" aria-hidden="true" />
            ) : (
              <i className="fa-solid fa-floppy-disk text-xl" aria-hidden="true" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        {/* Notificaciones Push */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <i className="fa-solid fa-bell text-xl text-brand-red" aria-hidden="true" />
            Notificaciones Push
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Recibe avisos de tus pedidos y promociones en este dispositivo.
          </p>
          <button
            type="button"
            onClick={() => void handleTestNotification()}
            disabled={pushSending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {pushSending ? (
              <i className="fa-solid fa-circle-notch text-xl animate-spin" aria-hidden="true" />
            ) : (
              <i className="fa-solid fa-bell text-xl" aria-hidden="true" />
            )}
            {pushSending ? 'Enviando...' : 'Probar notificación'}
          </button>
          {pushMessage && (
            <p role="status" className="mt-3 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              {pushMessage}
            </p>
          )}
          {pushError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              {pushError}
            </p>
          )}
        </div>

        {/* Modo de servicio — permite cambiar la decisión del onboarding */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <i className="fa-solid fa-store text-xl" aria-hidden="true" />
            Cómo quieres pedir
          </h3>
          <p className="mb-3 text-sm text-slate-600">
            {serviceMode === 'delivery'
              ? 'Ahora mismo estás en modo delivery: el marketplace te muestra los comercios cercanos que entregan a domicilio.'
              : serviceMode === 'in_store'
                ? 'Ahora mismo estás en modo "en el negocio": escaneas el QR de tu mesa para abrir el menú.'
                : 'Todavía no has elegido si pides en el local o por delivery.'}
          </p>
          <button
            type="button"
            onClick={handleChangeServiceMode}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
          >
            Cambiar a {serviceMode === 'delivery' ? 'en el negocio' : 'delivery'}
          </button>
        </div>

        {/* Zona de peligro */}
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
            <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true" />
            Zona de peligro
          </h3>
          <p className="mb-3 text-sm text-red-600">
            Esta acción es irreversible. Se eliminarán tus datos personales y se cerrará tu sesión.
          </p>
          <button
            type="button"
            onClick={openDeleteModal}
            disabled={isDeleting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? (
              <i className="fa-solid fa-circle-notch text-xl animate-spin" aria-hidden="true" />
            ) : null}
            Eliminar mi cuenta
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <i className="fa-solid fa-right-from-bracket text-xl" aria-hidden="true" />
          {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>

        {/* Modal de confirmación */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" onClick={closeDeleteModal} />
              <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h2 id="delete-modal-title" className="mb-4 flex items-center gap-2 text-lg font-bold text-red-700">
                  <i className="fa-solid fa-triangle-exclamation text-2xl" aria-hidden="true" />
                  Confirmar eliminación
                </h2>
                <p className="mb-4 text-sm text-slate-600">
                  Escribe <strong>ELIMINAR</strong> en el campo de abajo para confirmar que deseas borrar tu cuenta permanentemente.
                </p>
                <label className="block">
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="ELIMINAR"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                    autoFocus
                  />
                </label>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={confirmText !== 'ELIMINAR' || isDeleting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isDeleting ? (
                      <i className="fa-solid fa-circle-notch text-xl animate-spin" aria-hidden="true" />
                    ) : null}
                    Eliminar definitivamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
