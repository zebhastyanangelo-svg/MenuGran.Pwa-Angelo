-- Limpieza diaria de archivos huérfanos del bucket privado `payment-proofs`.
--
-- La Edge Function `clean-storage` compara los objetos del bucket con las
-- rutas activas de `orders.payment_proof_url` y elimina los comprobantes
-- subidos que ningún pedido referencia (p. ej. `tmp/…` de checkouts
-- abandonados), respetando un período de gracia de 24 h para no tocar
-- subidas en curso. Las imágenes del catálogo (ImgBB/Cloudinary) son
-- externas y no se ven afectadas.
--
-- Este job la invoca cada día a las 07:00 UTC = 03:00 a.m. hora de
-- Venezuela (UTC-4); pg_cron solo entiende GMT, de ahí el desfase con la
-- hora local. La llamada se hace mediante pg_net. La service_role key no
-- se hardcodea: se lee del secreto
-- de Supabase Vault `clean-storage-service-role`, cifrado y visible solo
-- para el rol `postgres`. Para (re)crear el secreto en un entorno nuevo,
-- una sola vez por entorno y nunca commiteando la clave:
--
--   delete from vault.secrets where name = 'clean-storage-service-role';
--   select vault.create_secret(
--     '<SERVICE_ROLE_KEY>',
--     'clean-storage-service-role',
--     'Bearer key (service_role) para el cron clean-storage-orphans'
--   );

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Programación idempotente: reemplaza el job si ya existía.
do $$
begin
  perform cron.unschedule('clean-storage-orphans');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'clean-storage-orphans',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://eeksewjxkkaasigjehat.supabase.co/functions/v1/clean-storage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'clean-storage-service-role'
        limit 1
      )
    ),
    body := jsonb_build_object('dryRun', false, 'maxAgeHours', 24),
    timeout_milliseconds := 60000
  );
  $$
);
