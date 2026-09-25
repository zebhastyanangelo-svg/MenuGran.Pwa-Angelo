CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_merchant_owner(target_merchant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.merchants AS merchant
    WHERE merchant.id = target_merchant_id
      AND merchant.owner_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.is_platform_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION private.merchant_staff_has_permission(
  target_merchant_id uuid,
  permission_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.is_platform_superadmin()
      OR private.is_merchant_owner(target_merchant_id)
      OR EXISTS (
        SELECT 1
        FROM public.merchant_staff AS staff
        WHERE staff.merchant_id = target_merchant_id
          AND staff.user_id = (SELECT auth.uid())
          AND staff.is_active = true
          AND coalesce(staff.role::text, 'merchant_staff') = 'merchant_staff'
          AND coalesce(staff.permissions ->> permission_name, 'false') = 'true'
      );
$$;

CREATE OR REPLACE FUNCTION private.is_merchant_staff_or_owner(target_merchant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.is_platform_superadmin()
      OR private.is_merchant_owner(target_merchant_id)
      OR EXISTS (
        SELECT 1
        FROM public.merchant_staff AS staff
        WHERE staff.merchant_id = target_merchant_id
          AND staff.user_id = (SELECT auth.uid())
          AND staff.is_active = true
          AND coalesce(staff.role::text, 'merchant_staff') = 'merchant_staff'
      );
$$;

CREATE OR REPLACE FUNCTION private.is_profile_visible_by_merchant(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
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
  );
$$;

CREATE OR REPLACE FUNCTION private.is_order_driver(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deliveries AS delivery
    JOIN public.orders AS delivery_order ON delivery_order.id = delivery.order_id
    JOIN public.merchant_staff AS driver_staff
      ON driver_staff.merchant_id = delivery_order.merchant_id
     AND driver_staff.user_id = (SELECT auth.uid())
     AND driver_staff.is_active = true
     AND coalesce(driver_staff.role::text, 'merchant_staff') = 'driver'
    WHERE delivery.order_id = p_order_id
      AND delivery.driver_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.is_order_customer(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders AS customer_order
    WHERE customer_order.id = p_order_id
      AND customer_order.customer_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.is_order_managed(
  p_order_id uuid,
  permission_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders AS managed_order
    WHERE managed_order.id = p_order_id
      AND private.merchant_staff_has_permission(
        managed_order.merchant_id,
        permission_name
      )
  );
$$;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_merchant_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_select_superadmin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_superadmin ON public.profiles;

DROP POLICY IF EXISTS merchants_select_public ON public.merchants;
DROP POLICY IF EXISTS merchants_select_owner ON public.merchants;
DROP POLICY IF EXISTS merchants_select_owner_v2 ON public.merchants;
DROP POLICY IF EXISTS merchants_select_staff ON public.merchants;
DROP POLICY IF EXISTS merchants_select_superadmin ON public.merchants;
DROP POLICY IF EXISTS merchants_insert_owner ON public.merchants;
DROP POLICY IF EXISTS merchants_insert_superadmin ON public.merchants;
DROP POLICY IF EXISTS merchants_update_owner ON public.merchants;
DROP POLICY IF EXISTS merchants_update_superadmin ON public.merchants;
DROP POLICY IF EXISTS merchants_delete_owner ON public.merchants;
DROP POLICY IF EXISTS merchants_delete_superadmin ON public.merchants;

DROP POLICY IF EXISTS staff_select_own ON public.merchant_staff;
DROP POLICY IF EXISTS staff_select_merchant_owner ON public.merchant_staff;
DROP POLICY IF EXISTS staff_insert_owner ON public.merchant_staff;
DROP POLICY IF EXISTS staff_update_owner ON public.merchant_staff;
DROP POLICY IF EXISTS staff_delete_owner ON public.merchant_staff;

DROP POLICY IF EXISTS orders_insert_customer ON public.orders;
DROP POLICY IF EXISTS orders_select_admin ON public.orders;
DROP POLICY IF EXISTS orders_select_customer ON public.orders;
DROP POLICY IF EXISTS orders_select_driver ON public.orders;
DROP POLICY IF EXISTS orders_select_merchant ON public.orders;
DROP POLICY IF EXISTS orders_select_owner_explicit ON public.orders;
DROP POLICY IF EXISTS orders_update_customer ON public.orders;
DROP POLICY IF EXISTS orders_update_driver ON public.orders;
DROP POLICY IF EXISTS orders_update_merchant ON public.orders;

DROP POLICY IF EXISTS deliveries_select_customer ON public.deliveries;
DROP POLICY IF EXISTS deliveries_select_driver ON public.deliveries;
DROP POLICY IF EXISTS deliveries_select_merchant ON public.deliveries;
DROP POLICY IF EXISTS deliveries_insert_merchant ON public.deliveries;
DROP POLICY IF EXISTS deliveries_update_driver ON public.deliveries;
DROP POLICY IF EXISTS deliveries_update_merchant ON public.deliveries;

CREATE POLICY profiles_select_authorized ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR private.is_profile_visible_by_merchant(id)
    OR private.is_platform_superadmin()
  );

CREATE POLICY profiles_update_authorized ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR private.is_platform_superadmin())
  WITH CHECK (id = (SELECT auth.uid()) OR private.is_platform_superadmin());

CREATE POLICY merchants_select_public ON public.merchants
  FOR SELECT TO anon
  USING (status = 'active' AND is_active = true);

CREATE POLICY merchants_select_authorized ON public.merchants
  FOR SELECT TO authenticated
  USING (
    (status = 'active' AND is_active = true)
    OR owner_id = (SELECT auth.uid())
    OR private.is_merchant_staff_or_owner(id)
    OR private.is_platform_superadmin()
  );

CREATE POLICY merchants_insert_authorized ON public.merchants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR private.is_platform_superadmin());

CREATE POLICY merchants_update_authorized ON public.merchants
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR private.is_platform_superadmin())
  WITH CHECK (owner_id = (SELECT auth.uid()) OR private.is_platform_superadmin());

CREATE POLICY merchants_delete_authorized ON public.merchants
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR private.is_platform_superadmin());

CREATE POLICY staff_select_authorized ON public.merchant_staff
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_merchant_staff_or_owner(merchant_id)
    OR private.is_platform_superadmin()
  );

CREATE POLICY staff_insert_authorized ON public.merchant_staff
  FOR INSERT TO authenticated
  WITH CHECK (private.is_merchant_owner(merchant_id) OR private.is_platform_superadmin());

CREATE POLICY staff_update_authorized ON public.merchant_staff
  FOR UPDATE TO authenticated
  USING (private.is_merchant_owner(merchant_id) OR private.is_platform_superadmin())
  WITH CHECK (private.is_merchant_owner(merchant_id) OR private.is_platform_superadmin());

CREATE POLICY staff_delete_authorized ON public.merchant_staff
  FOR DELETE TO authenticated
  USING (private.is_merchant_owner(merchant_id) OR private.is_platform_superadmin());

DROP POLICY IF EXISTS categories_insert_merchant ON public.categories;
DROP POLICY IF EXISTS categories_update_merchant ON public.categories;
DROP POLICY IF EXISTS categories_delete_merchant ON public.categories;
CREATE POLICY categories_insert_merchant ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (private.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));
CREATE POLICY categories_update_merchant ON public.categories
  FOR UPDATE TO authenticated
  USING (private.merchant_staff_has_permission(merchant_id, 'can_manage_menu'))
  WITH CHECK (private.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));
CREATE POLICY categories_delete_merchant ON public.categories
  FOR DELETE TO authenticated
  USING (private.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));

DROP POLICY IF EXISTS products_insert_merchant ON public.products;
DROP POLICY IF EXISTS products_update_merchant ON public.products;
DROP POLICY IF EXISTS products_delete_merchant ON public.products;
CREATE POLICY products_insert_merchant ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (private.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));
CREATE POLICY products_update_merchant ON public.products
  FOR UPDATE TO authenticated
  USING (private.merchant_staff_has_permission(merchant_id, 'can_manage_menu'))
  WITH CHECK (private.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));
CREATE POLICY products_delete_merchant ON public.products
  FOR DELETE TO authenticated
  USING (private.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));

CREATE POLICY orders_insert_customer ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = (SELECT auth.uid()));

CREATE POLICY orders_select_authorized ON public.orders
  FOR SELECT TO authenticated
  USING (
    private.is_platform_superadmin()
    OR customer_id = (SELECT auth.uid())
    OR private.is_order_driver(id)
    OR private.merchant_staff_has_permission(merchant_id, 'can_view_orders')
  );

CREATE POLICY orders_update_authorized ON public.orders
  FOR UPDATE TO authenticated
  USING (
    private.is_platform_superadmin()
    OR (
      customer_id = (SELECT auth.uid())
      AND status IN ('ready'::public.order_status, 'on_the_way'::public.order_status)
    )
    OR private.is_order_driver(id)
    OR private.merchant_staff_has_permission(merchant_id, 'can_manage_orders')
  )
  WITH CHECK (
    private.is_platform_superadmin()
    OR (customer_id = (SELECT auth.uid()) AND status = 'delivered'::public.order_status)
    OR private.is_order_driver(id)
    OR private.merchant_staff_has_permission(merchant_id, 'can_manage_orders')
  );

CREATE POLICY deliveries_insert_authorized ON public.deliveries
  FOR INSERT TO authenticated
  WITH CHECK (private.is_order_managed(order_id, 'can_manage_orders'));

CREATE POLICY deliveries_select_authorized ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    private.is_platform_superadmin()
    OR private.is_order_customer(order_id)
    OR private.is_order_driver(order_id)
    OR private.is_order_managed(order_id, 'can_manage_orders')
  );

CREATE POLICY deliveries_update_authorized ON public.deliveries
  FOR UPDATE TO authenticated
  USING (
    private.is_platform_superadmin()
    OR private.is_order_driver(order_id)
    OR private.is_order_managed(order_id, 'can_manage_orders')
  )
  WITH CHECK (
    private.is_platform_superadmin()
    OR private.is_order_driver(order_id)
    OR private.is_order_managed(order_id, 'can_manage_orders')
  );

DROP TRIGGER IF EXISTS profiles_guard_superadmin_role ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_superadmin_role();
DROP FUNCTION IF EXISTS public.debug_merchant_owner_ids();
DROP FUNCTION IF EXISTS public.get_order_customer_id(uuid);
DROP FUNCTION IF EXISTS public.get_order_merchant_id(uuid);
DROP FUNCTION IF EXISTS public.is_profile_visible_by_merchant(uuid);
DROP FUNCTION IF EXISTS public.is_merchant_staff_or_owner(uuid);
DROP FUNCTION IF EXISTS public.merchant_staff_has_permission(uuid, text);
DROP FUNCTION IF EXISTS public.is_order_driver(uuid);
DROP FUNCTION IF EXISTS public.is_merchant_owner(uuid);
DROP FUNCTION IF EXISTS public.is_merchant_owner_of_staff(uuid);
DROP FUNCTION IF EXISTS public.is_platform_superadmin();

REVOKE ALL ON FUNCTION private.is_merchant_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_platform_superadmin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.merchant_staff_has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_merchant_staff_or_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_profile_visible_by_merchant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_order_driver(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_order_customer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_order_managed(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_merchant_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_platform_superadmin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.merchant_staff_has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_merchant_staff_or_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_profile_visible_by_merchant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_order_driver(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_order_customer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_order_managed(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_payment_proofs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_payment_proofs() TO service_role;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
