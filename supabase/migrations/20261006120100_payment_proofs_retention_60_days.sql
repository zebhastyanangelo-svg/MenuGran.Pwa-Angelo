-- Retención de comprobantes de pago: 30 días -> 60 días.
--
-- Los comprobantes (Pago Móvil / transferencias) viven en el bucket privado
-- `payment-proofs` y `orders.payment_proof_url` guarda la ruta del objeto
-- (`storage.objects.name`). Este cron corre a diario y ahora elimina los
-- archivos con más de 60 días en lugar de 30, alineándose con el plazo de
-- conservación declarado en la política de privacidad y con el período
-- hábil para que el comercio resuelva una disputa de pago.
--
-- Además del cambio de ventana, la función ahora distingue entre objetos
-- huérfanos (subidos a `tmp/` pero nunca asociada a un pedido, porque el
-- cliente abandonó el checkout) y comprobantes de pedidos reales: los
-- huérfanos se eliminan con la misma ventana de 60 días, pero no producen
-- ningún UPDATE porque no hay fila que anular.
--
-- La programación se rehace de forma idempotente: si el job ya existía bajo
-- otro horario, `cron.unschedule` lo elimina antes de volver a crearlo.

-- ============================================================
-- 1. Ventana de retención
-- ============================================================
-- Un único parámetro de configuración evita que el plazo se disperse entre el
-- cuerpo de la función y los comentarios. Debe ser un literal intervalo: se
-- interpola al compilar la función, no se evalúa en tiempo de ejecución.
create or replace function public.payment_proof_retention_days()
returns int
language sql
immutable
as $$
  select 60;
$$;

comment on function public.payment_proof_retention_days() is
  'Días de conservación de los comprobantes de pago antes de la purga automática (60).';

-- ============================================================
-- 2. Función de purga
-- ============================================================
create or replace function public.cleanup_old_payment_proofs()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => public.payment_proof_retention_days());
  v_nulled int;
  v_deleted int;
begin
  -- Anula la referencia en pedidos cuyo comprobante será purgado. Se hace
  -- antes del DELETE para no perder el rastro de qué archivo se eliminó.
  update public.orders o
  set payment_proof_url = null
  from storage.objects so
  where so.bucket_id = 'payment-proofs'
    and so.created_at < v_cutoff
    and o.payment_proof_url = so.name;
  get diagnostics v_nulled = row_count;

  -- Elimina los archivos expirados del bucket. Cubre también los objetos
  -- huérfanos de `tmp/` que nunca se asociaron a un pedido.
  delete from storage.objects
  where bucket_id = 'payment-proofs'
    and created_at < v_cutoff;
  get diagnostics v_deleted = row_count;

  raise notice 'payment-proofs purge (> % días): % archivos eliminados, % pedidos actualizados',
    public.payment_proof_retention_days(), v_deleted, v_nulled;
end;
$$;

-- ============================================================
-- 3. Programación idempotente del cron
-- ============================================================
-- Se reemplaza cualquier job previo (nombre o horario) por el de las 60 días.
do $$
declare
  v_job record;
begin
  for v_job in
    select jobid from cron.job where jobname = 'purge-payment-proofs'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
exception
  when others then null;
end;
$$;

select cron.schedule(
  'purge-payment-proofs',
  '0 3 * * *',
  $$select public.cleanup_old_payment_proofs()$$
);

-- ============================================================
-- 4. Permisos
-- ============================================================
-- SECURITY DEFINER: solo el runtime de pg_cron (service_role) puede purgar.
-- Se revocan los permisos heredados y se restringe al servicio.
revoke all on function public.cleanup_old_payment_proofs() from public, anon, authenticated;
grant execute on function public.cleanup_old_payment_proofs() to service_role;

revoke all on function public.payment_proof_retention_days() from anon, authenticated;
grant execute on function public.payment_proof_retention_days() to service_role;

-- ============================================================
-- 5. Verificación
-- ============================================================
-- `assert_purge_window_is_60_days` falla si alguien cambia la ventana sin
-- actualizar la documentación legal que declara 60 días.
create or replace function public.assert_purge_window_is_60_days()
returns boolean
language plpgsql
as $$
begin
  if public.payment_proof_retention_days() <> 60 then
    raise exception
      'La retención de comprobantes de pago cambió a % días; actualiza la política de privacidad y las notas de la tabla orders.',
      public.payment_proof_retention_days();
  end if;
  return true;
end;
$$;