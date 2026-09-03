-- 20260902_0013_sync_migration_history_and_apply_driver_rls.sql
-- Sincroniza el historial de migraciones y aplica las RLS del repartidor.
--
-- Los objetos de las migraciones 0008-0011 ya existen en la DB remota.
-- Solo necesitamos registrar sus versiones en schema_migrations
-- y luego crear las policies de driver RLS.

-- ─── 1. Sincronizar historial de migraciones ──────────────────────
-- Estas migraciones ya fueron aplicadas manualmente o en ejecuciones
-- previas. Solo registramos sus versiones para que supabase db push
-- deje de intentar re-aplicarlas.
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20260830', '0008_fix_merchant_owner_id'),
  ('20260830120000', '0009_profiles_trigger_rls_realtime'),
  ('20260830120001', '0010_admin_orders_rls'),
  ('20260830120002', '0011_fix_orders_rls_policies')
ON CONFLICT (version) DO NOTHING;

-- ─── 2. RLS SELECT en orders para repartidores ───────────────────
-- Permite al repartidor ver cualquier order cuyo id aparezca en
-- deliveries con driver_id = auth.uid().
CREATE POLICY orders_select_driver ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.order_id = orders.id
        AND d.driver_id = auth.uid()
    )
  );

-- ─── 3. RLS UPDATE en orders para repartidores ───────────────────
-- Permite al repartidor actualizar el status de pedidos asignados
-- (ej. marcar "on_the_way", "delivered").
CREATE POLICY orders_update_driver ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.order_id = orders.id
        AND d.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.order_id = orders.id
        AND d.driver_id = auth.uid()
    )
  );
