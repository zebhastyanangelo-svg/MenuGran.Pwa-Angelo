-- 20260910_0001_fix_staff_staff_rls.sql
-- Corrige las políticas RLS que bloquean a los no-duenos para ver repartidores.
--
-- Causa raíz: La policy staff_select_own en merchant_staff solo permitía
-- user_id = auth.uid() OR is_merchant_owner(merchant_id). Los empleados
-- con rol merchant_staff no podían ver los registros de merchant_staff
-- de otros empleados del mismo comercio, incluyendo drivers.
--
-- Además, la policy profiles_select_own solo permitía id = auth.uid(),
-- bloqueando el JOIN con profiles y haciendo que row.profiles?.role
-- fuera siempre NULL para otros usuarios.

-- ============================================================
-- 1. Función auxiliar: verificar si un perfil pertenece a un
--    merchant_staff activo de un comercio al que auth.uid()
--    tiene acceso (dueño o staff)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_profile_visible_by_merchant(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$SELECT EXISTS (         SELECT 1          FROM public.merchant_staff target_ms         WHERE target_ms.user_id = target_user_id           AND public.is_merchant_staff_or_owner(target_ms.merchant_id)     );$$;

-- ============================================================
-- 2. Fix RLS en merchant_staff: permitir que staff vea todos los
--    empleados de su comercio (no solo los suyos ni solo los del owner)
-- ============================================================
DROP POLICY IF EXISTS staff_select_own ON public.merchant_staff;
CREATE POLICY staff_select_own ON public.merchant_staff
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_merchant_staff_or_owner(merchant_staff.merchant_id)
    );

DROP POLICY IF EXISTS staff_insert_owner ON public.merchant_staff;
CREATE POLICY staff_insert_owner ON public.merchant_staff
    FOR INSERT
    WITH CHECK (public.is_merchant_staff_or_owner(merchant_staff.merchant_id));

DROP POLICY IF EXISTS staff_update_owner ON public.merchant_staff;
CREATE POLICY staff_update_owner ON public.merchant_staff
    FOR UPDATE
    USING (public.is_merchant_staff_or_owner(merchant_staff.merchant_id))
    WITH CHECK (public.is_merchant_staff_or_owner(merchant_staff.merchant_id));

DROP POLICY IF EXISTS staff_delete_owner ON public.merchant_staff;
CREATE POLICY staff_delete_owner ON public.merchant_staff
    FOR DELETE
    USING (public.is_merchant_staff_or_owner(merchant_staff.merchant_id));

-- ============================================================
-- 3. Fix RLS en profiles: permitir que dueños y staff del comercio
--    vean los perfiles de los usuarios que son staff de su comercio
-- ============================================================
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT
    USING (
        id = auth.uid()
        OR public.is_profile_visible_by_merchant(profiles.id)
    );

-- Mantener las policies de update sin cambios (solo el propio perfil)
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());
