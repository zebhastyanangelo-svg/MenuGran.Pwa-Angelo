-- 20261021200000_fix_guard_merchant_admin_visibility.sql
-- Corrige el falso rechazo del Superadmin en guard_merchant_admin_visibility.
--
-- DIAGNÓSTICO (reproducido en producción simulando la ruta de PostgREST con
-- SET ROLE authenticated + request.jwt.claim.sub del superadmin):
-- la función era SECURITY DEFINER, así que current_user dentro de ella es el
-- DUEÑO de la función (postgres), no el rol asumido de la petición. Al no
-- existir el GUC request.jwt.claim.role en el camino real de PostgREST, el
-- COALESCE caía a 'postgres' y el trigger rechazaba al Superadmin legítimo
-- con "solo puede modificarla el Superadmin".
--
-- CORRECCIÓN:
-- 1. SECURITY INVOKER: current_user vuelve a ser el rol que PostgREST asumió
--    para la petición (authenticated / service_role), y postgres/supabase_admin
--    para migraciones y SQL directo. Esos roles de backend no son asumbibles
--    desde la API pública (authenticator solo puede SET ROLE a anon,
--    authenticated y service_role).
-- 2. La validación de Superadmin usa private.is_platform_superadmin() — el
--    mismo primitivo que las políticas RLS del panel (merchants_update_
--    authorized), que se apoya en auth.uid() (claim sub del JWT) y opera
--    correctamente en la misma petición. Se elimina toda dependencia del
--    GUC request.jwt.claim.role.

CREATE OR REPLACE FUNCTION public.guard_merchant_admin_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private
AS $$
BEGIN
  -- Solo actúa cuando el interruptor cambia de valor; el resto de la
  -- actualización de la fila pasa sin fricción.
  IF NEW.is_admin_active IS NOT DISTINCT FROM OLD.is_admin_active THEN
    RETURN NEW;
  END IF;

  -- Backend y mantenimiento: Edge Functions y consola operan con
  -- service_role; las migraciones y el SQL directo usan los roles de
  -- administración de la base de datos.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Superadmin autenticado vía API: idéntico chequeo al de las políticas
  -- RLS del panel, basado en auth.uid() + profiles.role.
  IF private.is_platform_superadmin() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'La visibilidad administrativa del comercio solo puede modificarla el Superadmin';
END;
$$;
