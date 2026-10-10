-- =============================================================================
-- Push Notifications: rol en suscripciones, webhook de pedidos nuevos y
-- cron de valoraciones bajas.
-- Fecha: 2026-10-10
--
--  1. `user_push_subscriptions.user_role`: rol denormalizado del suscriptor
--     (backfill + triggers que lo mantienen sincronizado con `profiles.role`).
--  2. Trigger `on_new_order_push`: al insertar un pedido, invoca la Edge
--     Function `send-push-notification` (target `merchant-new-order`) para
--     alertar al comercio correspondiente aunque la app esté cerrada.
--  3. Función + cron `alert_low_rated_merchants`: detecta comercios con
--     promedio < 3,5 estrellas (mínimo 3 valoraciones) y envía la alerta a
--     los SuperAdmins (target `merchant-rating-alerts`), con dedupe semanal.
--  4. Cron de recordatorios de menú: 9:00 a.m., 12:00 p.m. y 7:00 p.m.
--     hora de Venezuela (UTC-4) → 13:00, 16:00 y 23:00 GMT (pg_cron solo
--     entiende GMT), invocando el target `scheduled` ya existente.
--
-- Secretos (nunca se commitean): la service_role key vive en Supabase Vault.
-- Para (re)crearla en un entorno nuevo, una sola vez por entorno:
--
--   delete from vault.secrets where name = 'send-push-service-role';
--   select vault.create_secret(
--     '<SERVICE_ROLE_KEY>',
--     'send-push-service-role',
--     'Bearer key (service_role) para los cron jobs de send-push-notification'
--   );
--
-- El `cron_secret` de autorización se lee de `app_push_config` (fila id = 1).
-- =============================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1: user_role en user_push_subscriptions
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.user_push_subscriptions
  add column if not exists user_role public.user_role;

-- Backfill del rol para las suscripciones existentes.
update public.user_push_subscriptions as s
set user_role = p.role
from public.profiles as p
where s.user_id = p.id
  and s.user_role is distinct from p.role;

-- Índice de envío por rol (solo suscripciones activas).
create index if not exists idx_user_push_subscriptions_active_role
  on public.user_push_subscriptions (user_role)
  where is_active;

-- Completa el rol desde profiles cuando la suscripción llega sin él
-- (clientes antiguos o upserts que no envían user_role).
create or replace function public.set_push_subscription_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_role is null then
    select p.role into new.user_role
    from public.profiles as p
    where p.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_push_subscription_set_user_role
  on public.user_push_subscriptions;
create trigger on_push_subscription_set_user_role
  before insert or update on public.user_push_subscriptions
  for each row
  execute function public.set_push_subscription_user_role();

-- Propaga los cambios de rol del perfil a sus suscripciones push.
create or replace function public.sync_push_subscription_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_push_subscriptions
  set user_role = new.role
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_profile_role_changed_push_sync
  on public.profiles;
create trigger on_profile_role_changed_push_sync
  after update of role on public.profiles
  for each row
  execute function public.sync_push_subscription_user_role();

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 2: registro de alertas de valoración baja (dedupe del cron)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.merchant_rating_alert_log (
  merchant_id uuid primary key references public.merchants(id) on delete cascade,
  last_average numeric(4, 2) not null,
  last_count integer not null,
  alerted_at timestamptz not null default now()
);

-- Solo service_role / cron: sin políticas para anon/authenticated.
alter table public.merchant_rating_alert_log enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 3: on_new_order_push — webhook a la Edge Function en cada pedido nuevo
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.on_new_order_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_service_key text;
  v_cron_secret text;
begin
  if new.merchant_id is null then
    return new;
  end if;

  select decrypted_secret into v_service_key
  from vault.decrypted_secrets
  where name = 'send-push-service-role'
  limit 1;

  select cron_secret into v_cron_secret
  from public.app_push_config
  where id = 1;

  if v_service_key is null or v_cron_secret is null then
    raise notice 'on_new_order_push: secretos no configurados; push omitido';
    return new;
  end if;

  perform net.http_post(
    url := 'https://eeksewjxkkaasigjehat.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key,
      'x-cron-secret', v_cron_secret
    ),
    body := jsonb_build_object(
      'target', 'merchant-new-order',
      'orderId', new.id
    ),
    timeout_milliseconds := 10000
  );

  return new;
exception
  when others then
    -- El alta del pedido NUNCA falla por el push: solo se registra el fallo.
    raise notice 'on_new_order_push: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_new_order_push on public.orders;
create trigger on_new_order_push
  after insert on public.orders
  for each row
  execute function public.on_new_order_push();

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 4: alerta diaria de comercios con valoración baja → SuperAdmins
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.alert_low_rated_merchants()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_service_key text;
  v_cron_secret text;
  v_alerts jsonb;
  v_count integer;
begin
  select decrypted_secret into v_service_key
  from vault.decrypted_secrets
  where name = 'send-push-service-role'
  limit 1;

  select cron_secret into v_cron_secret
  from public.app_push_config
  where id = 1;

  if v_service_key is null or v_cron_secret is null then
    raise notice 'alert_low_rated_merchants: secretos no configurados';
    return 0;
  end if;

  -- Comercios con promedio < 3,5 estrellas (mínimo 3 valoraciones para no
  -- alertar por una sola opinión) que no recibieron la misma alerta en los
  -- últimos 7 días.
  with offenders as (
    select
      r.merchant_id,
      round(avg(r.merchant_stars), 2) as average,
      count(*)::integer as rating_count
    from public.order_ratings as r
    where r.merchant_id is not null
    group by r.merchant_id
    having avg(r.merchant_stars) < 3.5 and count(*) >= 3
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', o.merchant_id,
          'name', m.name,
          'average', o.average,
          'count', o.rating_count
        )
        order by o.average asc
      ),
      '[]'::jsonb
    ),
    count(o.merchant_id)::integer
  into v_alerts, v_count
  from offenders as o
  join public.merchants as m on m.id = o.merchant_id
  left join public.merchant_rating_alert_log as l on l.merchant_id = o.merchant_id
  where l.merchant_id is null
    or l.last_average is distinct from o.average
    or l.alerted_at < now() - interval '7 days';

  if v_count = 0 then
    return 0;
  end if;

  perform net.http_post(
    url := 'https://eeksewjxkkaasigjehat.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key,
      'x-cron-secret', v_cron_secret
    ),
    body := jsonb_build_object(
      'target', 'merchant-rating-alerts',
      'merchants', v_alerts
    ),
    timeout_milliseconds := 30000
  );

  insert into public.merchant_rating_alert_log
    (merchant_id, last_average, last_count, alerted_at)
  select
    (item ->> 'id')::uuid,
    (item ->> 'average')::numeric,
    (item ->> 'count')::integer,
    now()
  from jsonb_array_elements(v_alerts) as item
  on conflict (merchant_id) do update
    set last_average = excluded.last_average,
        last_count = excluded.last_count,
        alerted_at = excluded.alerted_at;

  return v_count;
end;
$$;

do $$
begin
  perform cron.unschedule('low-rated-merchants-alert');
exception
  when others then null;
end;
$$;

-- Diario a las 13:00 GMT = 9:00 a.m. hora de Venezuela (UTC-4).
select cron.schedule(
  'low-rated-merchants-alert',
  '0 13 * * *',
  $$select public.alert_low_rated_merchants()$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 5: recordatorios de menú (9:00 / 12:00 / 19:00 Venezuela)
--
-- El copy de cada franja lo elige la Edge Function (slots desayuno,
-- media-manana y cena), que además lo personaliza por usuario.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  perform cron.unschedule('push-reminder-desayuno');
  perform cron.unschedule('push-reminder-media-manana');
  perform cron.unschedule('push-reminder-cena');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'push-reminder-desayuno',
  '0 13 * * *',
  $$
  select net.http_post(
    url := 'https://eeksewjxkkaasigjehat.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'send-push-service-role'
        limit 1
      ),
      'x-cron-secret', (
        select cron_secret from public.app_push_config where id = 1
      )
    ),
    body := jsonb_build_object('target', 'scheduled', 'slot', 'desayuno'),
    timeout_milliseconds := 120000
  );
  $$
);

select cron.schedule(
  'push-reminder-media-manana',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://eeksewjxkkaasigjehat.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'send-push-service-role'
        limit 1
      ),
      'x-cron-secret', (
        select cron_secret from public.app_push_config where id = 1
      )
    ),
    body := jsonb_build_object('target', 'scheduled', 'slot', 'media-manana'),
    timeout_milliseconds := 120000
  );
  $$
);

select cron.schedule(
  'push-reminder-cena',
  '0 23 * * *',
  $$
  select net.http_post(
    url := 'https://eeksewjxkkaasigjehat.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'send-push-service-role'
        limit 1
      ),
      'x-cron-secret', (
        select cron_secret from public.app_push_config where id = 1
      )
    ),
    body := jsonb_build_object('target', 'scheduled', 'slot', 'cena'),
    timeout_milliseconds := 120000
  );
  $$
);
