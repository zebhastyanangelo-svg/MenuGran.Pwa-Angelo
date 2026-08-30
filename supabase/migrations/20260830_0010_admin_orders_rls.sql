-- Allow admin role to read all orders (fixes SuperAdmin dashboard metrics showing 0)
-- The admin role was not covered by any existing SELECT policy on the orders table,
-- so Supabase RLS blocked all reads for admin users.

CREATE POLICY orders_select_admin ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
