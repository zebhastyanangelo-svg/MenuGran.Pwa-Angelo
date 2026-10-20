-- El cliente puede ver quién lleva su pedido y contactarlo.
--
-- Problema: `profiles_select_authorized` solo deja leer el propio perfil, el
-- de un empleado del mismo comercio (`private.is_profile_visible_by_merchant`) o
-- el del superadmin. El repartidor asignado a un pedido NO entra en ninguna de
-- esas ramas, así que la consulta que el OrderTracker hacía sobre `profiles`
-- devolvía cero filas y `driverProfile` se quedaba en `null`: el cliente nunca
-- veía el nombre ni el teléfono de su repartidor.
--
-- Solución: una vista de solo lectura con las columnas de contacto, en vez de
-- abrir `profiles` al cliente. Así el cliente no gana acceso a `ci` ni a
-- `email` de terceros, que es lo que ocurriría al simplemente agregar una
-- policy sobre `profiles`.
--
-- La vista se resuelve con los privilegios de su propietario (no
-- `security_invoker`), por eso el WHERE es el que acota el alcance y usa
-- `auth.uid()`, que se evalúa por petición.

CREATE OR REPLACE VIEW public.order_driver_contact AS
SELECT
  customer_order.id AS order_id,
  customer_order.driver_id,
  driver_profile.full_name,
  driver_profile.phone,
  driver_profile.avatar_url
FROM public.orders AS customer_order
JOIN public.profiles AS driver_profile
  ON driver_profile.id = customer_order.driver_id
WHERE customer_order.customer_id = (SELECT auth.uid())
  AND customer_order.driver_id IS NOT NULL;

COMMENT ON VIEW public.order_driver_contact IS
  'Contacto del repartidor asignado (nombre, teléfono y avatar) limitado a los pedidos del propio cliente. Es lo único que el cliente puede leer de un perfil ajeno.';

GRANT SELECT ON public.order_driver_contact TO authenticated;
