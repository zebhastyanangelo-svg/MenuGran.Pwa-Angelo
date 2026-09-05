-- 20260905_0014_fix_orders_select_admin_rls.sql
-- Corrige recursión infinita en policies RLS de orders ↔ deliveries.
--
-- CAUSA RAÍZ: Las policies de SELECT en `orders` referencian `deliveries`
-- (orders_select_driver), y las policies de SELECT en `deliveries` referencian
-- `orders` (deliveries_select_customer, deliveries_select_merchant). Cuando
-- PostgreSQL evalúa una policy de orders, ejecuta el subquery sobre deliveries,
-- que a su vez evalúa sus policies, que ejecutan subqueries sobre orders, etc.
-- → infinite recursion detected in policy for relation "orders".
--
-- SOLUCIÓN: Crear funciones SECURITY DEFINER que bypass RLS y rompen el ciclo.
-- SECURITY DEFINER hace que la función se ejecute con los privilegios del owner
-- (postgres), evitando que las policies de la tabla referenciada se evalúen.

-- ============================================================
-- PASO 1: Funciones SECURITY DEFINER auxiliares
-- ============================================================

-- Verifica si el usuario autenticado es driver de una orden específica.
-- ROMPE: orders → deliveries (bypass deliveries RLS)
CREATE OR REPLACE FUNCTION public.is_order_driver(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.order_id = p_order_id
      AND d.driver_id = auth.uid()
  );
$function$;

-- Obtiene el customer_id de una orden sin pasar por orders RLS.
-- ROMPE: deliveries → orders (bypass orders RLS)
CREATE OR REPLACE FUNCTION public.get_order_customer_id(p_order_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.customer_id FROM public.orders o WHERE o.id = p_order_id;
$function$;

-- Obtiene el merchant_id de una orden sin pasar por orders RLS.
-- ROMPE: deliveries → orders (bypass orders RLS)
CREATE OR REPLACE FUNCTION public.get_order_merchant_id(p_order_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.merchant_id FROM public.orders o WHERE o.id = p_order_id;
$function$;

-- ============================================================
-- PASO 2: Reemplazar policies de orders que referencian deliveries
-- ============================================================

DROP POLICY IF EXISTS orders_select_driver ON public.orders;
CREATE POLICY orders_select_driver ON public.orders
  FOR SELECT
  USING (public.is_order_driver(orders.id));

DROP POLICY IF EXISTS orders_update_driver ON public.orders;
CREATE POLICY orders_update_driver ON public.orders
  FOR UPDATE
  USING (public.is_order_driver(orders.id))
  WITH CHECK (public.is_order_driver(orders.id));

-- ============================================================
-- PASO 3: Reemplazar policies de deliveries que referencian orders
-- ============================================================

DROP POLICY IF EXISTS deliveries_select_customer ON public.deliveries;
CREATE POLICY deliveries_select_customer ON public.deliveries
  FOR SELECT
  USING (public.get_order_customer_id(deliveries.order_id) = auth.uid());

DROP POLICY IF EXISTS deliveries_select_merchant ON public.deliveries;
CREATE POLICY deliveries_select_merchant ON public.deliveries
  FOR SELECT
  USING (public.is_merchant_staff_or_owner(
    public.get_order_merchant_id(deliveries.order_id)
  ));

DROP POLICY IF EXISTS deliveries_update_merchant ON public.deliveries;
CREATE POLICY deliveries_update_merchant ON public.deliveries
  FOR UPDATE
  USING (public.is_merchant_staff_or_owner(
    public.get_order_merchant_id(deliveries.order_id)
  ));
