import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { saveServiceMode, type ServiceMode } from '../../utils/serviceMode';
import { ServiceModeChooser } from './ServiceModeChooser';

/**
 * Muestra la pantalla "¿Estás en el negocio o deseas pedir un delivery?" al
 * abrir la aplicación.
 *
 * A diferencia del tutorial (`CustomerOnboardingGate`), esta decisión NO es un
 * tutorialDismissable: el modo de servicio define cómo se comporta la PWA en
 * esa sesión (dónde se buscan comercios, si el checkout pregunta por el tipo de
 * despacho y si el cliente arranca en el lector de QR). Por eso no ofrece
 * "saltar" y se vuelve a preguntar en cada arranque de la app en lugar de
 * quedarse guardado para siempre.
 *
 * Solo se consulta una vez por montaje: `showChooser` se apaga en cuanto el
 * cliente elige, así que navegar dentro de la sesión no vuelve a interrumpirlo.
 * Cerrar y reabrir la PWA sí lo hace, que es exactamente el comportamiento
 * pedido.
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
    // Se pregunta siempre: el modo guardado en la sesión anterior solo sirve
    // para el resto de esa sesión, no para decidir cómo arrancar hoy.
    setShowChooser(true);
  }, [isLoading, user, profile]);

  const handleSelect = useCallback((mode: ServiceMode) => {
    saveServiceMode(mode);
    setShowChooser(false);
  }, []);

  if (!showChooser) return null;

  return <ServiceModeChooser onSelect={handleSelect} />;
}