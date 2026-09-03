-- =============================================================================
-- Migración: Auto-creación de Profiles + RLS Multi-Rol en Orders + Realtime
-- Fecha: 2026-08-30
-- Descripción:
--   1. Trigger para auto-crear profiles cuando se registra un usuario nuevo
--   2. Backfill de profiles faltantes para users existentes en auth.users
--   3. Consolidación de políticas RLS en orders (owner + staff)
--   4. Verificación de realtime en orders
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1: Función + Trigger para auto-crear profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- Función que se ejecuta cuando un usuario nuevo se registra en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'customer'::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 2: Backfill de profiles faltantes
-- Inserta profiles para users que existen en auth.users pero no en profiles
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, email, role)
SELECT
  u.id,
  COALESCE(u.email, ''),
  'customer'::user_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 3: Consolidar políticas RLS en orders
-- Unificar owner + staff en una sola política limpia
-- ─────────────────────────────────────────────────────────────────────────────

-- Eliminar políticas SELECT redundantes
DROP POLICY IF EXISTS orders_select_owner_explicit ON public.orders;
DROP POLICY IF EXISTS orders_select_merchant ON public.orders;

-- Política unificada: el dueño O un staff activo puede ver pedidos de su comercio
CREATE POLICY orders_select_merchant ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    -- El usuario es el dueño del comercio
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = orders.merchant_id
        AND m.owner_id = auth.uid()
    )
    OR
    -- O es un staff activo asignado a ese comercio
    EXISTS (
      SELECT 1 FROM public.merchant_staff ms
      WHERE ms.merchant_id = orders.merchant_id
        AND ms.user_id = auth.uid()
        AND ms.is_active = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 4: Verificar/asegurar que orders esté en la publicación realtime
-- ─────────────────────────────────────────────────────────────────────────────

-- La tabla orders ya debe estar en supabase_realtime.
-- Solo agregar si no está ya en la publicación.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'orders'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 5: Verificación final (logs para debugging)
-- ─────────────────────────────────────────────────────────────────────────────

-- Contar profiles después del backfill
DO $$
DECLARE
  total_users INTEGER;
  total_profiles INTEGER;
  missing_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  SELECT COUNT(*) INTO missing_profiles
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL;

  RAISE NOTICE 'Total auth.users: %', total_users;
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE 'Profiles faltantes (después del backfill): %', missing_profiles;
END $$;

-- Verificar que la política RLS se creó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
      AND policyname = 'orders_select_merchant'
      AND qual LIKE '%merchant_staff%'
  ) THEN
    RAISE NOTICE 'Política orders_select_merchant creada correctamente (owner + staff)';
  ELSE
    RAISE WARNING 'ERROR: Política orders_select_merchant no se creó correctamente';
  END IF;
END $$;

-- Verificar realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'orders'
  ) THEN
    RAISE NOTICE 'Tabla orders habilitada en supabase_realtime ✓';
  ELSE
    RAISE WARNING 'ERROR: Tabla orders NO está en supabase_realtime';
  END IF;
END $$;
