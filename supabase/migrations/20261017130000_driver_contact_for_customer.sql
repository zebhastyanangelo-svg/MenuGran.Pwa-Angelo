-- El cliente puede ver quién lleva su pedido y contactarlo.
--
-- Problema: `profiles_select_authorized` solo deja leer el propio perfil, el
-- de un empleado del mismo comercio (`private.is_profile_visible_by_merchant`) o
-- el del superadmin. El repartidor asignado a un pedido NO entra en ninguna de
-- esas ramas, así que la consulta que el OrderTracker hacía sobre `profiles`
-- devolvía cero filas y `driverProfile` se quedaba en `null`: el cliente nunca
-- veía el nombre ni el teléfono de su repartidor.
--
-- Solución: una función RPC de solo lectura con las columnas de contacto, en
-- vez de abrir `profiles` al cliente. Agregar una policy sobre `profiles`
-- expondría también `ci` y `email` de terceros, que es justo lo que se quiere
-- evitar; la función devuelve solo lo que el cliente necesita para llamar.
--
-- La función es SECURITY DEFINER porque debe leer `profiles` y `orders` saltándose
-- el RLS del cliente. Ese bypass es exactamente lo que obliga a que el filtro
-- por `customer_id = auth.uid()` esté dentro de la función, y no en el cliente.
-- Se anota `search_path` para que un rol con permisos de creación de esquemas no
-- pueda secuestrar la resolución de nombres, igual que el resto de `private/`.

CREATE OR REPLACE FUNCTION public.customer_driver_contact(p_order_id uuid)
RETURNS TABLE (
  driver_id uuid,
  full_name text,
  phone text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT
    driver_profile.id,
    driver_profile.full_name,
    driver_profile.phone,
    driver_profile.avatar_url
  FROM public.orders AS customer_order
  JOIN public.profiles AS driver_profile
    ON driver_profile.id = customer_order.driver_id
  WHERE customer_order.id = p_order_id
    AND customer_order.customer_id = (SELECT auth.uid())
    AND customer_order.driver_id IS NOT NULL;
$function$;

COMMENT ON FUNCTION public.customer_driver_contact(uuid) IS
  'Nombre, teléfono y avatar del repartidor asignado a un pedido. Solo devuelve datos si el pedido pertenece al usuario que llama; nunca expone ci ni email.';

-- Por defecto Postgres concede EXECUTE a PUBLIC y además Supabase aplica
-- `ALTER DEFAULT PRIVILEGES` para concederlo a `anon`, `authenticated` y
-- `service_role` en cada función nueva de `public`. Revocar solo de PUBLIC no
-- alcanza: `anon` conserva un permiso explícito y podría invocar la función sin
-- sesión. Se revoca de ambos y se limita a los usuarios autenticados.
REVOKE ALL ON FUNCTION public.customer_driver_contact(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_driver_contact(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.customer_driver_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_driver_contact(uuid) TO service_role;