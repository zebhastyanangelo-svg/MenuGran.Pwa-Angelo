-- 0023 — Login social (Google OAuth): conservar roles corporativos
-- =============================================================================
-- Problema: al entrar con "Continuar con Google", el trigger on_auth_user_created
-- creaba el perfil siempre con rol 'customer' (o fallaba por el UNIQUE de email
-- cuando el correo ya había sido registrado administrativamente), pisando el
-- rol asignado por el superadmin/comercio (merchant_owner, merchant_staff,
-- driver).
--
-- PARTE A: FKs hacia profiles(id) añaden ON UPDATE CASCADE, requisito para
--          reasignar el id del perfil sin romper merchants, merchant_staff,
--          orders y deliveries.
-- PARTE B: handle_new_user reescrito:
--          1. Si ya existe un perfil con ese email (pre-creado por el
--             superadmin o el comercio), reasigna su id al nuevo auth.uid
--             CONSERVANDO el rol y las vinculaciones (cascada en UPDATE).
--          2. Si no, crea el perfil con el rol recibido por metadata
--             (nunca 'superadmin') o 'customer' por defecto.
--          3. Si el perfil ya existe para ese id, solo refresca email/nombre;
--             jamás toca el rol.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PARTE A: ON UPDATE CASCADE en FKs que referencian profiles(id)
-- ---------------------------------------------------------------------------

alter table public.merchants
  drop constraint if exists merchants_owner_id_fkey;
alter table public.merchants
  add constraint merchants_owner_id_fkey
  foreign key (owner_id) references public.profiles(id)
  on delete cascade on update cascade;

alter table public.merchant_staff
  drop constraint if exists merchant_staff_user_id_fkey;
alter table public.merchant_staff
  add constraint merchant_staff_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade on update cascade;

alter table public.orders
  drop constraint if exists orders_customer_id_fkey;
alter table public.orders
  add constraint orders_customer_id_fkey
  foreign key (customer_id) references public.profiles(id)
  on delete set null on update cascade;

alter table public.orders
  drop constraint if exists orders_driver_id_fkey;
alter table public.orders
  add constraint orders_driver_id_fkey
  foreign key (driver_id) references public.profiles(id)
  on delete set null on update cascade;

alter table public.deliveries
  drop constraint if exists deliveries_driver_id_fkey;
alter table public.deliveries
  add constraint deliveries_driver_id_fkey
  foreign key (driver_id) references public.profiles(id)
  on delete set null on update cascade;

-- ---------------------------------------------------------------------------
-- PARTE B: handle_new_user con conservación de rol y vinculación por email
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role public.user_role;
  meta_name text;
begin
  -- Rol solicitado vía metadata (registro con contraseña o edge functions).
  -- 'superadmin' jamás se acepta por metadata: el guard profiles_guard_superadmin_role
  -- solo lo permite vía service_role y aquí se evita auto-promoción.
  meta_role := case NEW.raw_user_meta_data ->> 'role'
    when 'merchant_owner' then 'merchant_owner'::public.user_role
    when 'merchant_staff' then 'merchant_staff'::public.user_role
    when 'driver' then 'driver'::public.user_role
    else 'customer'::public.user_role
  end;
  meta_name := nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'full_name', '')), '');

  -- 1) Vinculación automática por email: si el correo ya fue registrado por
  --    administración (propietario, empleado o repartidor), el perfil existente
  --    adopta el nuevo auth.uid conservando su rol y sus relaciones.
  if coalesce(NEW.email, '') <> '' then
    update public.profiles p
       set id = NEW.id,
           email = NEW.email,
           full_name = coalesce(meta_name, p.full_name)
     where lower(p.email) = lower(NEW.email)
       and p.id <> NEW.id;
    if found then
      return NEW;
    end if;
  end if;

  -- 2) Alta estándar. En conflicto por id solo se refrescan datos de contacto:
  --    el rol existente se conserva siempre.
  insert into public.profiles (id, email, full_name, role)
  values (NEW.id, coalesce(NEW.email, ''), meta_name, meta_role)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
