-- ============================================================
-- 0019: Permitir que el cliente confirme la entrega de su pedido
-- ============================================================
-- Problema: solo existían policies UPDATE para merchant y driver.
-- El UPDATE del cliente (status -> 'delivered') era bloqueado
-- silenciosamente por RLS (0 filas, sin error), por lo que la UI
-- mostraba éxito pero la BD nunca cambiaba y ni el repartidor ni
-- el comercio se enteraban vía Realtime.
--
-- Esta policy permite al cliente autenticado actualizar ÚNICAMENTE
-- su propia orden cuando está 'ready' u 'on_the_way', y el resultado
-- debe mantener el mismo customer_id con status = 'delivered'.
-- ============================================================

DROP POLICY IF EXISTS orders_update_customer ON public.orders;
CREATE POLICY orders_update_customer ON public.orders
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() AND status IN ('ready', 'on_the_way'))
  WITH CHECK (customer_id = auth.uid() AND status = 'delivered');

-- Asegurar que orders sigue publicada en Realtime (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
