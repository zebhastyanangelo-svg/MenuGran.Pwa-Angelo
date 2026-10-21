-- 20261021120000_merchant_admin_visibility.sql
-- Control de visibilidad global de comercios por el Superadmin.
--
-- 1. Columna `is_admin_active` (boolean, NOT NULL, default true): interruptor
--    administrativo que oculta un comercio del marketplace público sin
--    suspender su operación interna (el dueño mantiene acceso a su panel).
-- 2. Trigger guardián: la columna solo puede alternarla el Superadmin o el
--    backend (service_role). La política RLS `merchants_update_authorized`
--    permite al dueño actualizar su fila completa, así que el trigger es el
--    que impide que el comerciante modifique este interruptor desde su panel.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS is_admin_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.merchants.is_admin_active IS
  'Visibilidad administrativa: cuando es false, el marketplace oculta el comercio del público general. Solo el Superadmin puede modificarla.';

CREATE OR REPLACE FUNCTION public.guard_merchant_admin_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Solo actúa cuando el interruptor cambia de valor; el resto de la
  -- actualización de la fila pasa sin fricción.
  IF NEW.is_admin_active IS NOT DISTINCT FROM OLD.is_admin_active THEN
    RETURN NEW;
  END IF;

  caller_role := COALESCE(
    current_setting('request.jwt.claim.role', true),
    current_user::text
  );

  -- Operaciones privilegiadas del backend (Edge Functions con service_role).
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Únicamente el Superadmin puede alternar la visibilidad administrativa.
  IF caller_role = 'authenticated' AND private.is_platform_superadmin() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'La visibilidad administrativa del comercio solo puede modificarla el Superadmin';
END;
$$;

REVOKE ALL ON FUNCTION public.guard_merchant_admin_visibility() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guard_merchant_admin_visibility()
  TO authenticated, service_role;

DROP TRIGGER IF EXISTS merchants_guard_admin_visibility ON public.merchants;

CREATE TRIGGER merchants_guard_admin_visibility
  BEFORE UPDATE OF is_admin_active ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_merchant_admin_visibility();
