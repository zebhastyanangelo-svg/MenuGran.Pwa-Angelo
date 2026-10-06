-- Rellena dos columnas que existían en la base de producción pero que ninguna
-- migración declaraba. Se insertan aquí, y no al final del historial, porque
-- su ausencia rompe migraciones anteriores.
--
-- 1. `orders.driver_id` — Ninguna migración la creaba, pero cuatro ya la
--    asumen y fallan sin ella:
--      · 20260924_0023_oauth_role_linking.sql        (ADD CONSTRAINT ... FK)
--      · 20260924120000_0020_fk_cascade_and_cleanup   (ADD CONSTRAINT ... FK)
--      · 20260925045004_fix_merchant_roles_and_rls     (FK + idx_orders_driver_id)
--    Es decir, `supabase db reset` estaba roto desde `20260924_0023`.
--
--    Ojo con `deliveries.driver_id`: esa SÍ está declarada en el esquema
--    inicial (línea 132 de 20260811_0001). Todas las políticas RLS que
--    filtran por `delivery.driver_id` son válidas y no se tocan aquí.
--
-- 2. `profiles.onboarding_completed` — La usa `CustomerOnboardingGate` para
--    persistir la bienvenida en el perfil, pero solo dentro de un try/catch
--    best-effort. En un entorno recién creado, la llamada a PostgREST fallaba
--    con "column does not exist", el error se tragaba y el estado de
--    onboarding se perdía al cambiar de dispositivo. Ahora la columna existe y
--    el guardado remoto vuelve a funcionar.
--
-- Por qué una versión "antigua": las columnas deben existir ANTES de que corran
-- las migraciones que las referencian. Editar `20260811_0001_initial_schema.sql`
-- para meterlas sería reescribir historial ya aplicado (y el ledger remoto lo
-- tiene registrado), así que se añaden aquí con una versión que ordena entre
-- `20260923` y `20260924`.
--
-- Todo es idempotente: en la base de producción, donde ambas columnas ya
-- existen, este archivo es un no-op.

-- 1. Repartidor asignado al pedido.
--
-- El REFERENCES en línea genera la restricción con el nombre que las
-- migraciones posteriores esperan encontrar (`orders_driver_id_fkey`), de modo
-- que sus `DROP CONSTRAINT IF EXISTS` / `ADD CONSTRAINT` posteriores funcionan
-- sin cambios. Aquí va `ON DELETE SET NULL` y no `ON UPDATE CASCADE` porque es
-- lo que declara el esquema inicial para esta familia de columnas;
-- `20260925045004` la re-declara ya con CASCADE en UPDATE.
alter table public.orders
  add column if not exists driver_id uuid references public.profiles(id) on delete set null;

comment on column public.orders.driver_id is
  'Perfil del repartidor asignado al pedido. NULL mientras nobody lo toma. ON DELETE SET NULL: si se borra el repartidor, el pedido sobrevive sin él.';

-- El índice lo crea también 20260925045004; se declara aquí para que la
-- versión final del esquema no dependa de una migración intermedia.
create index if not exists idx_orders_driver_id on public.orders (driver_id);

-- 2. Marca de bienvenida completada.
--
-- El default false hace que un cliente existente que nunca abrió la app
-- reciba la pantalla de bienvenida en su primera visita, que es el
-- comportamiento previsto.
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

comment on column public.profiles.onboarding_completed is
  'Verdadero si el cliente ya completó la pantalla de bienvenida. Espejo en localStorage de la clave menugram_onboarding_completed; esta columna permite que el estado sobreviva a un cambio de dispositivo.';