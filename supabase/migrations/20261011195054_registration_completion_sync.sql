-- Sincronización de autenticación unificada (email/contraseña + Google OAuth)
-- 1) Marca de registro completado: distingue al usuario que ya completó el
--    formulario (o fue creado por administración) del que entró por Google por
--    primera vez y aún no completa sus datos.
alter table public.profiles
  add column if not exists registration_completed boolean not null default false;

-- Backfill: todos los perfiles existentes son usuarios registrados.
update public.profiles set registration_completed = true;

-- 2) handle_new_user sincronizado:
--    - Vinculación por email (correo pre-registrado por administración):
--      conserva rol, datos y registration_completed del perfil existente.
--    - Alta nueva: persiste ci/phone desde metadata y marca
--      registration_completed = true solo para registros con contraseña o
--      roles corporativos (nunca para el primer login con Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role public.user_role;
  meta_name text;
  meta_ci text;
  meta_phone text;
  meta_registration_completed boolean;
begin
  meta_role := case NEW.raw_user_meta_data ->> 'role'
    when 'merchant_owner' then 'merchant_owner'::public.user_role
    when 'merchant_staff' then 'merchant_staff'::public.user_role
    when 'driver' then 'driver'::public.user_role
    else 'customer'::public.user_role
  end;
  meta_name := nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'full_name', '')), '');
  meta_ci := nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'ci', '')), '');
  meta_phone := nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'phone', '')), '');
  meta_registration_completed :=
    (meta_role <> 'customer'::public.user_role)
    or (coalesce(NEW.raw_user_meta_data ->> 'registration_completed', 'false') = 'true');

  -- 1) Vinculación automática por email: si el correo ya fue registrado por
  --    administración, el perfil existente adopta el nuevo auth.uid conservando
  --    su rol, sus relaciones y su estado de registro.
  if coalesce(NEW.email, '') <> '' and NEW.email_confirmed_at is not null then
    update public.profiles as profile
       set id = NEW.id,
           email = NEW.email,
           full_name = coalesce(meta_name, profile.full_name)
     where lower(profile.email) = lower(NEW.email)
       and profile.id <> NEW.id;
    if found then
      return NEW;
    end if;
  end if;

  -- 2) Alta estándar. En conflicto por id solo se refrescan datos de contacto;
  --    el rol existente se conserva siempre y la marca de registro es
  --    acumulativa (nunca se revierte a false).
  insert into public.profiles (id, email, full_name, ci, phone, role, registration_completed)
  values (NEW.id, coalesce(NEW.email, ''), meta_name, meta_ci, meta_phone, meta_role, meta_registration_completed)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        ci = coalesce(excluded.ci, public.profiles.ci),
        phone = coalesce(excluded.phone, public.profiles.phone),
        registration_completed = public.profiles.registration_completed or excluded.registration_completed;

  return NEW;
end;
$$;
