-- Permite al comercio (dueño, o staff con permiso can_view_orders) leer los
-- perfiles de los CLIENTES con pedidos en sus comercios. Antes la función
-- solo cubría perfiles de personal (merchant_staff), por lo que el join
-- `profiles!customer_id(...)` del panel de pedidos devolvía NULL y los campos
-- Email / Cédula del modal "Detalle del pedido" salían vacíos ("—").
--
-- Se reutiliza merchant_staff_has_permission(merchant_id, 'can_view_orders'),
-- el mismo criterio que autoriza la lectura de pedidos en
-- private.is_order_managed, de modo que quien puede ver un pedido también
-- puede ver el perfil del cliente que lo hizo. Índice requerido ya existe:
-- idx_orders_customer_id.
CREATE OR REPLACE FUNCTION private.is_profile_visible_by_merchant(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.merchant_staff AS target_staff
    WHERE target_staff.user_id = target_user_id
      AND target_staff.is_active = true
      AND (
        private.is_merchant_owner(target_staff.merchant_id)
        OR (
          coalesce(target_staff.role::text, 'merchant_staff') = 'merchant_staff'
          AND private.is_merchant_staff_or_owner(target_staff.merchant_id)
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.orders AS customer_order
    WHERE customer_order.customer_id = target_user_id
      AND private.merchant_staff_has_permission(
        customer_order.merchant_id,
        'can_view_orders'
      )
  );
$function$;
