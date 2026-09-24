-- 0021 — Purga automática de comprobantes de pago con retención de 30 días.
--
-- Los comprobantes (pago móvil / transferencias) viven en el bucket privado
-- `payment-proofs` y orders.payment_proof_url guarda la ruta del objeto
-- (storage.objects.name). Cada día a las 03:00 UTC se eliminan los archivos
-- con más de 30 días y se anula la referencia en el pedido. Las imágenes del
-- catálogo (ImgBB/Cloudinary) son externas y no se ven afectadas.

create extension if not exists pg_cron with schema extensions;

create or replace function public.cleanup_old_payment_proofs()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_nulled int;
  v_deleted int;
begin
  -- Anula la referencia en pedidos cuyo comprobante será purgado.
  update public.orders o
  set payment_proof_url = null
  from storage.objects so
  where so.bucket_id = 'payment-proofs'
    and so.created_at < now() - interval '30 days'
    and o.payment_proof_url = so.name;
  get diagnostics v_nulled = row_count;

  -- Elimina los archivos expirados del bucket de comprobantes.
  delete from storage.objects
  where bucket_id = 'payment-proofs'
    and created_at < now() - interval '30 days';
  get diagnostics v_deleted = row_count;

  raise notice 'payment-proofs purge: % archivos eliminados, % pedidos actualizados',
    v_deleted, v_nulled;
end;
$$;

-- Programación idempotente: reemplaza el job si ya existía.
do $$
begin
  perform cron.unschedule('purge-payment-proofs');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'purge-payment-proofs',
  '0 3 * * *',
  $$select public.cleanup_old_payment_proofs()$$
);
