import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { readServiceMode, saveServiceMode, type ServiceMode } from '../../utils/serviceMode';
import { ServiceModeChooser } from './ServiceModeChooser';

/**
 * Muestra la pantalla "¿Estás en el negocio o deseas pedir un delivery?" la
 * primera vez que entra un cliente con sesión.
 *
 * A diferencia del tutorial (`CustomerOnboardingGate`), esta decisión NO es
 * un tutorialDismissable: define el modo de servicio de la sesión y por eso
 * no ofrece "saltar". Si el cliente cambia de idea más adelante puede volver
 * a elegirlo desde su perfil, que es quien limpia la marca.
 *
 * Solo aplica al rol `customer`: un comercio o un repartidor entran por sus
 * propias rutas y no pasan por el marketplace.
 */
export function ServiceModeGate() {
  const { user, profile, isLoading } = useAuth();
  const [showChooser, setShowChooser] = useState(false);

  useEffect(() => {
    if (isLoading || user === null || profile === null) return;
    if (profile.role !== 'customer') return;
    if (readServiceMode() !== null) return;
    setShowChooser(true);
  }, [isLoading, user, profile]);

  const handleSelect = (mode: ServiceMode) => {
    saveServiceMode(mode);
    setShowChooser(false);
  };

  if (!showChooser) return null;

  return <ServiceModeChooser onSelect={handleSelect} />;
}