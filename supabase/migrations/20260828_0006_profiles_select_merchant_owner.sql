-- 20260828_0006_profiles_select_merchant_owner.sql
-- Permite a los propietarios de comercios (merchant_owner) leer los perfiles
-- de los empleados (merchant_staff) vinculados a SU negocio.
--
-- Sin esta política, el JOIN profiles:user_id en listStaff devuelve NULL
-- porque la única política de SELECT para authenticated es la de superadmin.
-- Resultado: las tarjetas de empleado muestran "Sin nombre" y "sin email".

CREATE OR REPLACE FUNCTION public.is_merchant_owner_of_staff(staff_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.merchant_staff ms
    JOIN public.merchants m ON m.id = ms.merchant_id
    WHERE ms.user_id = staff_user_id
      AND m.owner_id = auth.uid()
      AND ms.is_active = true
  );
$$;

DROP POLICY IF EXISTS profiles_select_merchant_owner ON public.profiles;

CREATE POLICY profiles_select_merchant_owner ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_merchant_owner_of_staff(id));
