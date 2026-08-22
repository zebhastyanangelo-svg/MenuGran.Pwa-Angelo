-- 20260821_0003_guard_superadmin.sql
-- Protección del rol superadmin:
-- 1. Índice único parcial: solo puede existir UN Super Admin en la plataforma.
-- 2. Trigger: el rol 'superadmin' no puede asignarse desde la API pública
--    (anon/authenticated). Solo lo permite el service_role (operaciones de
--    backend/panel) o una actualización que el propio Super Admin haga de su
--    misma fila. El registro público (handle_new_user) crea 'customer', por lo
--    que jamás puede auto-promocionarse un superadmin desde la PWA.

CREATE UNIQUE INDEX IF NOT EXISTS profiles_single_superadmin
  ON public.profiles ((role))
  WHERE role = 'superadmin';

CREATE OR REPLACE FUNCTION public.guard_superadmin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  caller_sub text;
BEGIN
  IF NEW.role IS DISTINCT FROM 'superadmin' THEN
    RETURN NEW;
  END IF;

  caller_role := COALESCE(
    current_setting('request.jwt.claim.role', true),
    current_user::text
  );
  caller_sub := COALESCE(current_setting('request.jwt.claim.sub', true), '');

  -- Operaciones privilegiadas (backend con service_role).
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- El Super Admin existente puede actualizar su propia fila (p. ej. nombre)
  -- manteniendo el rol.
  IF TG_OP = 'UPDATE'
     AND caller_role = 'authenticated'
     AND caller_sub <> ''
     AND NEW.id::text = caller_sub
     AND EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = NEW.id AND role = 'superadmin'
     ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'El rol superadmin no puede asignarse mediante la API pública';
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_superadmin_role ON public.profiles;

CREATE TRIGGER profiles_guard_superadmin_role
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_superadmin_role();
