-- Contactos que las RLS de `profiles` esconden a repartidor y empleado.
--
-- Contexto: `profiles_select_authorized` solo deja leer el propio perfil, el de
-- un empleado del mismo comercio (`private.is_profile_visible_by_merchant`) o el
-- del superadmin. De ahí quedan fuera dos consultas que el panel necesita:
--
--   1. El repartidor asignado NO puede leer el perfil del cliente: la función
--      exige ser empleado de tipo `merchant_staff` con `can_view_orders`, y un
--      repartidor tiene rol `driver`. Como el JOIN llega NULL, el repartidor
--      nunca veía el teléfono del cliente y el botón "Llamar al cliente" de la
--      entrega activa no se renderizaba nunca.
--   2. El empleado de tipo `merchant_staff` NO puede leer el perfil de un
--      repartidor de su comercio: esa rama solo abre los perfiles cuyo rol en
--      `merchant_staff` es `merchant_staff`. El selector "Asignar Rider" recibía
--      la fila con `profiles: null` y caía en mostrar el UUID.
--
-- Solución: funciones RPC de solo lectura que devuelven SOLO las columnas de
-- contacto. Agregar policies sobre `profiles` expondría además `ci` y `email` de
-- terceros, que es justo lo que se quiere evitar.
--
-- Ambas son SECURITY DEFINER porque deben leer `profiles` saltándose el RLS del
-- llamador. Ese bypass es exactamente lo que obliga a que el filtro por
-- `auth.uid()` esté dentro de la función y no en el cliente: son las únicas dos
-- ventanas por las que se leen datos de terceros.

-- ---------------------------------------------------------------------------
-- 1. Cliente de la entrega asignada, para el repartidor que la transporta.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.driver_customer_contact(p_order_id uuid)
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  email text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT
    customer_profile.id,
    customer_profile.full_name,
    customer_profile.email,
    customer_profile.phone
  FROM public.orders AS driver_order
  JOIN public.profiles AS customer_profile
    ON customer_profile.id = driver_order.customer_id
  WHERE driver_order.id = p_order_id
    AND private.is_order_driver(p_order_id);
$function$;

COMMENT ON FUNCTION public.driver_customer_contact(uuid) IS
  'Nombre, email y teléfono del cliente de una entrega. Solo devuelve datos si el llamador es el repartidor asignado al pedido; nunca expone la cédula.';

-- ---------------------------------------------------------------------------
-- 2. Nombre y correo de los repartidores de un comercio, para su panel.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merchant_drivers_directory(p_merchant_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT
    driver_staff.user_id,
    driver_profile.full_name,
    driver_profile.email
  FROM public.merchant_staff AS driver_staff
  JOIN public.profiles AS driver_profile
    ON driver_profile.id = driver_staff.user_id
  WHERE driver_staff.merchant_id = ANY (p_merchant_ids)
    AND driver_staff.is_active = true
    AND coalesce(driver_staff.role::text, 'merchant_staff') = 'driver'
    AND (
      private.is_platform_superadmin()
      OR private.is_merchant_staff_or_owner(driver_staff.merchant_id)
    );
$function$;

COMMENT ON FUNCTION public.merchant_drivers_directory(uuid[]) IS
  'Nombre y correo de los repartidores activos de los comercios indicados. Solo devuelve datos para quien administra esos comercios; nunca expone la cédula.';

-- Por defecto Postgres concede EXECUTE a PUBLIC y además Supabase aplica
-- `ALTER DEFAULT PRIVILEGES` para concederlo a `anon`, `authenticated` y
-- `service_role` en cada función nueva de `public`. Revocar solo de PUBLIC no
-- alcanza: `anon` conserva un permiso explícito y podría invocar la función sin
-- sesión. Se revoca de ambos y se limita a los usuarios autenticados.
REVOKE ALL ON FUNCTION public.driver_customer_contact(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.driver_customer_contact(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.driver_customer_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_customer_contact(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.merchant_drivers_directory(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_drivers_directory(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.merchant_drivers_directory(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_drivers_directory(uuid[]) TO service_role;
