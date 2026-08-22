-- 20260821_0002_superadmin_merchants.sql
-- Soporte para el panel de Super Admin: alta y gestión de comercios.
--
-- 1. Columna `ci` en profiles para guardar la C.I. del propietario.
-- 2. Políticas RLS que permiten al rol 'superadmin' leer/crear/actualizar
--    merchants de cualquier propietario y actualizar perfiles (asignar el
--    rol merchant_owner tras registrar la cuenta).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ci text;

CREATE POLICY merchants_select_superadmin ON public.merchants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY merchants_insert_superadmin ON public.merchants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY merchants_update_superadmin ON public.merchants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY profiles_select_superadmin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS caller
      WHERE caller.id = auth.uid() AND caller.role = 'superadmin'
    )
  );

CREATE POLICY profiles_update_superadmin ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
