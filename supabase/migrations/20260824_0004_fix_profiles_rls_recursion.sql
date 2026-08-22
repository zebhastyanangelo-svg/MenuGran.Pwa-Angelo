-- 20260824_0004_fix_profiles_rls_recursion.sql
-- Corrige recursión infinita (42P17) introducida por las políticas
-- profiles_*_superadmin de la migración 20260821_0002: consultaban la tabla
-- `profiles` dentro de políticas SOBRE `profiles`, rompiendo la lectura del
-- perfil para todos los usuarios.
--
-- Solución: helper SECURITY DEFINER que evalúa el rol sin re-entrar en el RLS,
-- y políticas reescritas para usarlo (también las de merchants).

CREATE OR REPLACE FUNCTION public.is_platform_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Perfiles -----------------------------------------------------------------

DROP POLICY IF EXISTS profiles_select_superadmin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_superadmin ON public.profiles;

CREATE POLICY profiles_select_superadmin ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_superadmin());

CREATE POLICY profiles_update_superadmin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_platform_superadmin());

-- Comercios ----------------------------------------------------------------

DROP POLICY IF EXISTS merchants_select_superadmin ON public.merchants;
DROP POLICY IF EXISTS merchants_insert_superadmin ON public.merchants;
DROP POLICY IF EXISTS merchants_update_superadmin ON public.merchants;

CREATE POLICY merchants_select_superadmin ON public.merchants
  FOR SELECT TO authenticated
  USING (public.is_platform_superadmin());

CREATE POLICY merchants_insert_superadmin ON public.merchants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_superadmin());

CREATE POLICY merchants_update_superadmin ON public.merchants
  FOR UPDATE TO authenticated
  USING (public.is_platform_superadmin());
