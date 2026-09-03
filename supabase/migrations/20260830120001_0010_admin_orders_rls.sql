-- Allow superadmin role to read all orders (fixes SuperAdmin dashboard metrics showing 0)

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
