-- Agrega columna driver_id a la tabla orders para vincular repartidores.
-- driver_id referencia profiles(id) y se establece cuando el reparto toma el pedido.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índice para consultas rápidas de pedidos asignados a un repartidor
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders (driver_id);

-- RLS: el repartidor solo puede ver pedidos asignados a él o listos para tomar
CREATE POLICY "drivers_view_own_or_ready_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR (
      status = 'ready'
      AND EXISTS (
        SELECT 1 FROM public.merchant_staff
        WHERE merchant_staff.merchant_id = orders.merchant_id
          AND merchant_staff.user_id = auth.uid()
          AND merchant_staff.is_active = true
      )
    )
  );

-- RLS: el repartidor puede actualizar pedidos asignados a él (cambiar status, driver_id)
CREATE POLICY "drivers_update_assigned_orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR (
      status = 'ready'
      AND EXISTS (
        SELECT 1 FROM public.merchant_staff
        WHERE merchant_staff.merchant_id = orders.merchant_id
          AND merchant_staff.user_id = auth.uid()
          AND merchant_staff.is_active = true
      )
    )
  )
  WITH CHECK (
    driver_id = auth.uid()
    OR driver_id IS NULL
  );
