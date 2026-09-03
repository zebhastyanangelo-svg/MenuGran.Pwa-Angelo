-- 20260830_0011_fix_orders_rls_policies.sql
-- Corrige la política orders_select_admin que referenciaba el rol inexistente
-- 'admin' (debería ser 'superadmin') y elimina la política redundante
-- orders_select_owner_explicit que ya está cubierta por orders_select_merchant.

-- ─── 1. Corregir orders_select_admin ──────────────────────────────────
-- La migración 0010 creó esta política con role = 'admin', pero el enum
-- user_role solo contiene: superadmin, merchant_owner, merchant_staff,
-- driver, customer. Nunca matcheaba ningún usuario.
DROP POLICY IF EXISTS orders_select_admin ON public.orders;

CREATE POLICY orders_select_admin ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- ─── 2. Eliminar política redundante ─────────────────────────────────
-- orders_select_owner_explicit (migración 0007) es subsumida por
-- orders_select_merchant (migración 0009) que ya cubre owners mediante
-- EXISTS sobre merchants.owner_id.
DROP POLICY IF EXISTS orders_select_owner_explicit ON public.orders;
