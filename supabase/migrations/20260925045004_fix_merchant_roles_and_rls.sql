ALTER FUNCTION public.set_updated_at() SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_name text;
BEGIN
  meta_name := nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'full_name', '')), '');

  IF coalesce(NEW.email, '') <> '' AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles AS profile
       SET id = NEW.id,
           email = NEW.email,
           full_name = coalesce(meta_name, profile.full_name)
     WHERE lower(profile.email) = lower(NEW.email)
       AND profile.id <> NEW.id;
    IF FOUND THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, coalesce(NEW.email, ''), meta_name, 'customer'::public.user_role)
  ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'El rol de perfil solo puede ser modificado por el servidor';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_profile_role ON public.profiles;
CREATE TRIGGER profiles_guard_profile_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_change();

CREATE OR REPLACE FUNCTION public.is_merchant_owner(target_merchant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.merchants AS merchant
    WHERE merchant.id = target_merchant_id
      AND merchant.owner_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_merchant_staff_or_owner(target_merchant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_merchant_owner(target_merchant_id)
      OR EXISTS (
        SELECT 1
        FROM public.merchant_staff AS staff
        WHERE staff.merchant_id = target_merchant_id
          AND staff.user_id = (SELECT auth.uid())
          AND staff.is_active = true
          AND coalesce(staff.role::text, 'merchant_staff') = 'merchant_staff'
      );
$$;

CREATE OR REPLACE FUNCTION public.merchant_staff_has_permission(
  target_merchant_id uuid,
  permission_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_merchant_owner(target_merchant_id)
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

CREATE OR REPLACE FUNCTION public.is_profile_visible_by_merchant(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.merchant_staff AS target_staff
    WHERE target_staff.user_id = target_user_id
      AND target_staff.is_active = true
      AND (
        public.is_merchant_owner(target_staff.merchant_id)
        OR (
          coalesce(target_staff.role::text, 'merchant_staff') = 'merchant_staff'
          AND public.is_merchant_staff_or_owner(target_staff.merchant_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_order_driver(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.is_platform_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_merchant_owner_of_staff(staff_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.merchant_staff AS staff
    JOIN public.merchants AS merchant ON merchant.id = staff.merchant_id
    WHERE staff.user_id = staff_user_id
      AND merchant.owner_id = (SELECT auth.uid())
  );
$$;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.is_profile_visible_by_merchant(id));

DROP POLICY IF EXISTS profiles_select_merchant_owner ON public.profiles;
CREATE POLICY profiles_select_merchant_owner ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_profile_visible_by_merchant(id));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS merchants_select_owner ON public.merchants;
DROP POLICY IF EXISTS merchants_select_owner_v2 ON public.merchants;
DROP POLICY IF EXISTS merchants_select_staff ON public.merchants;
DROP POLICY IF EXISTS merchants_select_superadmin ON public.merchants;
DROP POLICY IF EXISTS merchants_insert_owner ON public.merchants;
DROP POLICY IF EXISTS merchants_insert_superadmin ON public.merchants;
DROP POLICY IF EXISTS merchants_update_owner ON public.merchants;
DROP POLICY IF EXISTS merchants_update_superadmin ON public.merchants;
DROP POLICY IF EXISTS merchants_delete_owner ON public.merchants;

CREATE POLICY merchants_select_owner ON public.merchants
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));
CREATE POLICY merchants_select_staff ON public.merchants
  FOR SELECT TO authenticated
  USING (public.is_merchant_staff_or_owner(id));
CREATE POLICY merchants_select_superadmin ON public.merchants
  FOR SELECT TO authenticated
  USING (public.is_platform_superadmin());
CREATE POLICY merchants_insert_owner ON public.merchants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY merchants_insert_superadmin ON public.merchants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_superadmin());
CREATE POLICY merchants_update_owner ON public.merchants
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY merchants_update_superadmin ON public.merchants
  FOR UPDATE TO authenticated
  USING (public.is_platform_superadmin())
  WITH CHECK (public.is_platform_superadmin());
CREATE POLICY merchants_delete_owner ON public.merchants
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS staff_select_own ON public.merchant_staff;
DROP POLICY IF EXISTS staff_insert_owner ON public.merchant_staff;
DROP POLICY IF EXISTS staff_update_owner ON public.merchant_staff;
DROP POLICY IF EXISTS staff_delete_owner ON public.merchant_staff;

CREATE POLICY staff_select_own ON public.merchant_staff
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_merchant_staff_or_owner(merchant_id)
  );
CREATE POLICY staff_insert_owner ON public.merchant_staff
  FOR INSERT TO authenticated
  WITH CHECK (public.is_merchant_owner(merchant_id));
CREATE POLICY staff_update_owner ON public.merchant_staff
  FOR UPDATE TO authenticated
  USING (public.is_merchant_owner(merchant_id))
  WITH CHECK (public.is_merchant_owner(merchant_id));
CREATE POLICY staff_delete_owner ON public.merchant_staff
  FOR DELETE TO authenticated
  USING (public.is_merchant_owner(merchant_id));

DROP POLICY IF EXISTS categories_insert_merchant ON public.categories;
DROP POLICY IF EXISTS categories_update_merchant ON public.categories;
DROP POLICY IF EXISTS categories_delete_merchant ON public.categories;
CREATE POLICY categories_insert_merchant ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (public.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));
CREATE POLICY categories_update_merchant ON public.categories
  FOR UPDATE TO authenticated
  USING (public.merchant_staff_has_permission(merchant_id, 'can_manage_menu'))
  WITH CHECK (public.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));
CREATE POLICY categories_delete_merchant ON public.categories
  FOR DELETE TO authenticated
  USING (public.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));

DROP POLICY IF EXISTS products_insert_merchant ON public.products;
DROP POLICY IF EXISTS products_update_merchant ON public.products;
DROP POLICY IF EXISTS products_delete_merchant ON public.products;
CREATE POLICY products_insert_merchant ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));
CREATE POLICY products_update_merchant ON public.products
  FOR UPDATE TO authenticated
  USING (public.merchant_staff_has_permission(merchant_id, 'can_manage_menu'))
  WITH CHECK (public.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));
CREATE POLICY products_delete_merchant ON public.products
  FOR DELETE TO authenticated
  USING (public.merchant_staff_has_permission(merchant_id, 'can_manage_menu'));

DROP POLICY IF EXISTS orders_select_merchant ON public.orders;
DROP POLICY IF EXISTS orders_update_merchant ON public.orders;
DROP POLICY IF EXISTS orders_update_driver ON public.orders;
CREATE POLICY orders_select_merchant ON public.orders
  FOR SELECT TO authenticated
  USING (public.merchant_staff_has_permission(merchant_id, 'can_view_orders'));
CREATE POLICY orders_update_merchant ON public.orders
  FOR UPDATE TO authenticated
  USING (public.merchant_staff_has_permission(merchant_id, 'can_manage_orders'))
  WITH CHECK (public.merchant_staff_has_permission(merchant_id, 'can_manage_orders'));
CREATE POLICY orders_update_driver ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_order_driver(id))
  WITH CHECK (public.is_order_driver(id));

DROP POLICY IF EXISTS deliveries_insert_merchant ON public.deliveries;
DROP POLICY IF EXISTS deliveries_select_merchant ON public.deliveries;
DROP POLICY IF EXISTS deliveries_update_merchant ON public.deliveries;
DROP POLICY IF EXISTS deliveries_update_driver ON public.deliveries;
CREATE POLICY deliveries_select_merchant ON public.deliveries
  FOR SELECT TO authenticated
  USING (public.merchant_staff_has_permission(
    public.get_order_merchant_id(order_id),
    'can_manage_orders'
  ));
CREATE POLICY deliveries_insert_merchant ON public.deliveries
  FOR INSERT TO authenticated
  WITH CHECK (public.merchant_staff_has_permission(
    public.get_order_merchant_id(order_id),
    'can_manage_orders'
  ));
CREATE POLICY deliveries_update_merchant ON public.deliveries
  FOR UPDATE TO authenticated
  USING (public.merchant_staff_has_permission(
    public.get_order_merchant_id(order_id),
    'can_manage_orders'
  ))
  WITH CHECK (public.merchant_staff_has_permission(
    public.get_order_merchant_id(order_id),
    'can_manage_orders'
  ));
CREATE POLICY deliveries_update_driver ON public.deliveries
  FOR UPDATE TO authenticated
  USING (public.is_order_driver(order_id))
  WITH CHECK (public.is_order_driver(order_id));

ALTER TABLE public.merchants
  DROP CONSTRAINT IF EXISTS merchants_owner_id_fkey,
  ADD CONSTRAINT merchants_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.merchant_staff
  DROP CONSTRAINT IF EXISTS merchant_staff_user_id_fkey,
  ADD CONSTRAINT merchant_staff_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_id_fkey,
  ADD CONSTRAINT orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_driver_id_fkey,
  ADD CONSTRAINT orders_driver_id_fkey
    FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE public.deliveries
  DROP CONSTRAINT IF EXISTS deliveries_driver_id_fkey,
  ADD CONSTRAINT deliveries_driver_id_fkey
    FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_merchant_id ON public.categories(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_staff_user_id ON public.merchant_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_owner_id ON public.merchants(owner_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_role_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_merchant_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_merchant_staff_or_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.merchant_staff_has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_profile_visible_by_merchant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_order_driver(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_platform_superadmin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_merchant_owner_of_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_merchant_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_merchant_staff_or_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.merchant_staff_has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_profile_visible_by_merchant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_order_driver(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_superadmin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_merchant_owner_of_staff(uuid) TO authenticated, service_role;
