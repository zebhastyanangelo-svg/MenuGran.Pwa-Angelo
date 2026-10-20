-- El endpoint de un push identifica al NAVEGADOR, no al usuario. Con
-- `UNIQUE (endpoint)` global, si el usuario B se suscribe en un dispositivo
-- donde antes se suscribió el usuario A, el `ON CONFLICT (endpoint) DO UPDATE`
-- de PostgREST intenta actualizar una fila ajena: la política
-- `users_update_own_subscriptions` (USING user_id = auth.uid()) la rechaza y
-- Postgres responde 42501 -> HTTP 403. INSERT/UPDATE nunca surtan efecto porque
-- el conflicto se resuelve sobre una fila que el usuario actual no posee.
--
-- La identidad correcta de una suscripción es (user_id, endpoint): el mismo
-- dispositivo puede pertenecer a varias cuentas a lo largo del tiempo, y cada
-- cuenta necesita su propia fila para que el envío se dirija a quien está
-- autenticado.

alter table public.user_push_subscriptions
  drop constraint if exists user_push_subscriptions_endpoint_key;

alter table public.user_push_subscriptions
  add constraint user_push_subscriptions_user_endpoint_key
  unique (user_id, endpoint);

-- Índice de envío: la Edge Function filtra por `is_active` y por `user_id`.
create index if not exists idx_user_push_subscriptions_active_user
  on public.user_push_subscriptions (user_id)
  where is_active;

-- `users_manage_own_push_subscriptions` (FOR ALL) ya cubre INSERT, UPDATE y
-- DELETE con USING/WITH CHECK = user_id = auth.uid(). Las políticas por
-- comando son redundantes y, al combinarse por PERMISSIVE, la de ALL es la que
-- termina aplicándose; se eliminan para que exista una sola definición de la
-- regla y no puedan divergir en el futuro.
drop policy if exists users_insert_own_subscriptions on public.user_push_subscriptions;
drop policy if exists users_update_own_subscriptions on public.user_push_subscriptions;
drop policy if exists users_delete_own_subscriptions on public.user_push_subscriptions;
drop policy if exists users_view_own_subscriptions on public.user_push_subscriptions;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_push_subscriptions'
      and policyname = 'users_manage_own_push_subscriptions'
  ) then
    create policy users_manage_own_push_subscriptions
      on public.user_push_subscriptions
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end
$$;

comment on constraint user_push_subscriptions_user_endpoint_key
  on public.user_push_subscriptions is
  'Identidad de la suscripción = (usuario, endpoint). El endpoint pertenece al navegador, no al usuario: un mismo dispositivo puede usar varias cuentas.';