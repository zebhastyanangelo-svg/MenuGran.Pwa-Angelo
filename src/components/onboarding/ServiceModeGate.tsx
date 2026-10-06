import { useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  isServiceModeSessionResolved,
  saveServiceMode,
  subscribeToServiceMode,
  type ServiceMode,
} from '../../utils/serviceMode';
import { ServiceModeChooser } from './ServiceModeChooser';

/**
 * Muestra la pantalla "¿Estás en el negocio o deseas pedir un delivery?" al
 * abrir la aplicación.
 *
 * A diferencia del tutorial (`CustomerOnboardingGate`), esta decisión NO es un
 * tutorialDismissable: el modo de servicio define cómo se comporta la PWA en
 * esa sesión (dónde se buscan comercios, si el checkout pregunta por el tipo
 * de despacho y si el cliente arranca en el lector de QR). Por eso no ofrece
 * "saltar" y se vuelve a preguntar en cada arranque de la app en lugar de
 * quedarse guardado para siempre.
 *
 * La visibilidad se DERIVA de dos señales en lugar de guardarse en un estado
 * local: el rol del usuario (`useAuth`) y la resolución de la sesión
 * (`isServiceModeSessionResolved`, en memoria). Así el gate vuelve a aparecer
 * si algo borra el modo a mitad de sesión (p. ej. "cambiar modalidad" desde
 * el perfil) y el marketplace puede esperar la misma señal sin acoplarse al
 * componente.
 *
 * Solo aplica al rol `customer`: un comercio o un repartidor entran por sus
 * propias rutas y no pasan por el marketplace.
 */
export function ServiceModeGate() {
  const { user, profile, isLoading } = useAuth();
  const isSessionResolved = useSyncExternalStore(
    subscribeToServiceMode,
    isServiceModeSessionResolved,
  );

  const handleSelect = useCallback((mode: ServiceMode) => {
    // `saveServiceMode` marca la sesión como resuelta y notifica a los
    // suscriptores: el propio gate se oculta y el marketplace se desbloquea.
    saveServiceMode(mode);
  }, []);

  const isCustomer =
    !isLoading && user !== null && profile !== null && profile.role === 'customer';

  if (!isCustomer || isSessionResolved) return null;

  return <ServiceModeChooser onSelect={handleSelect} />;
}
