-- Endurece el search_path de las funciones de retención de comprobantes.
--
-- El linter de Supabase (lint 0011) marca `payment_proof_retention_days` y
-- `assert_purge_window_is_60_days` como funciones con `search_path` modificable
-- por el rol: un atacante con CREATE en un esquema anterior al del
-- `search_path` podría ejecutar código en lugar de estas funciones.
--
-- Se sigue el criterio del resto del proyecto (`harden_trigger_functions_search_path`
-- y `harden_rls_private_helpers`): fijar el search_path de forma explícita.
-- Aquí se usa la forma más estricta posible, `search_path = ''`, porque
-- ninguna de las dos necesita resolver nada por nombre: el cuerpo ya califica
-- `public.payment_proof_retention_days()` y el literal `60` no busca esquema.

create or replace function public.payment_proof_retention_days()
returns int
language sql
immutable
set search_path = ''
as $$
  select 60;
$$;

comment on function public.payment_proof_retention_days() is
  'Días de conservación de los comprobantes de pago antes de la purga automática (60).';

create or replace function public.assert_purge_window_is_60_days()
returns boolean
language plpgsql
set search_path = ''
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

-- `cleanup_old_payment_proofs` ya fijaba `search_path = public, storage`
-- porque necesita leer `storage.objects`; se deja intacta a propósito.

revoke all on function public.payment_proof_retention_days() from anon, authenticated;
grant execute on function public.payment_proof_retention_days() to service_role;