-- 20260824_0005_sync_merchants_columns.sql
-- Sincroniza la tabla merchants remota con el schema documentado
-- (docs/DATABASE-SCHEMA.md): la base fue creada manualmente desde una versión
-- anterior y carece de columnas que el frontend utiliza (rif, category,
-- is_open, address, etc.), rompiendo el panel de Super Admin y los ajustes
-- del comerciante.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_category') THEN
    CREATE TYPE public.merchant_category AS ENUM (
      'Comida rápida', 'Restaurante', 'Bebidas', 'Postres',
      'Repostería', 'Bodegón', 'Otro'
    );
  END IF;
END $$;

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rif text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category public.merchant_category NOT NULL DEFAULT 'Otro',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS zone text,
  ADD COLUMN IF NOT EXISTS phone_whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS service_modalities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_hours jsonb
    NOT NULL DEFAULT '{"days":"Lunes a Domingo","open_time":"08:00","close_time":"20:00"}';
