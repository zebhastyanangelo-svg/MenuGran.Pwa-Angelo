-- 20260829_0007_diagnose_merchant_orders.sql
-- Diagnóstico: por qué el panel de comerciante no muestra pedidos.
--
-- CAUSA MÁS PROBABLE: la función is_merchant_staff_or_owner() ejecuta
-- SECURITY DEFINER y consulta merchants/merchant_staff, pero el RLS en
-- orders SELECT puede estar devolviendo 0 filas si el caller no tiene
-- permiso. Esta migración:
--   1. Añade una política SELECT alternativa para merchants dueños
--      (equivalente a orders_select_merchant pero explícita).
--   2. Crea una función de diagnóstico que el merchant_owner puede
--      llamar para ver si su owner_id coincide con su auth.uid().
--   3. Garantiza que la política SELECT de merchants permita al
--      owner ver su propia fila (ya existe, pero reforzamos).

-- ─── 1. Función de diagnóstico ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.debug_merchant_owner_ids()
RETURNS TABLE (
  merchant_id UUID,
  merchant_name TEXT,
  merchant_owner_id UUID,
  merchant_is_active BOOLEAN,
  current_auth_uid UUID,
  owner_match BOOLEAN,
  order_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS merchant_id,
    m.name AS merchant_name,
    m.owner_id AS merchant_owner_id,
    m.is_active AS merchant_is_active,
    auth.uid() AS current_auth_uid,
    (m.owner_id = auth.uid()) AS owner_match,
    (SELECT count(*) FROM public.orders o WHERE o.merchant_id = m.id) AS order_count
  FROM public.merchants m
  WHERE m.owner_id = auth.uid()
     OR EXISTS (
       SELECT 1 FROM public.merchant_staff ms
       WHERE ms.merchant_id = m.id AND ms.user_id = auth.uid() AND ms.is_active = true
     );
$$;

-- ─── 2. Política SELECT explícita para merchant_owner en orders ────────
-- La política actual orders_select_merchant usa is_merchant_staff_or_owner
-- que es SECURITY DEFINER y debería funcionar. Sin embargo, si la función
-- no existe o tiene un bug, esta política de respaldo garantiza que el
-- dueño del comercio pueda ver los pedidos de SU comercio.
DROP POLICY IF EXISTS orders_select_owner_explicit ON public.orders;
CREATE POLICY orders_select_owner_explicit ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = orders.merchant_id
        AND m.owner_id = auth.uid()
    )
  );

-- ─── 3. Verificar que merchants_owner también permite SELECT ──────────
-- (Ya existe merchants_select_owner, pero reforzamos por si acaso)
DROP POLICY IF EXISTS merchants_select_owner_v2 ON public.merchants;
CREATE POLICY merchants_select_owner_v2 ON public.merchants
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
