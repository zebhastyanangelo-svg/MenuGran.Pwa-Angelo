-- ============================================================================
-- image_version: versión de la imagen para invalidar la caché del navegador
-- ============================================================================
-- Las fotos de logo/banner (comercios) y de los platos se sirven desde un
-- CDN externo (ImgBB) o desde Supabase Storage. El móvil cachea esas URLs con
-- su caché HTTP y con el Service Worker, por lo que tras cambiar la imagen el
-- cliente puede seguir viendo la versión anterior durante días.
--
-- `image_version` se bumpea SOLO cuando cambia la columna de la imagen, de
-- modo que el frontend pueda anexarla como parámetro `?v=` y forzar la
-- descarga de la versión vigente sin invalidar la caché en cada cambio de la
-- fila (abrir/cerrar, promociones, precios, etc.).
-- ============================================================================

alter table public.merchants
  add column if not exists image_version timestamptz default now() not null;

alter table public.products
  add column if not exists image_version timestamptz default now() not null;

comment on column public.merchants.image_version is
  'Se actualiza automáticamente cuando cambia logo_url o banner_url. El frontend la usa como parametro ?v= en la URL de la imagen para invalidar la cache obsoleta del navegador.';

comment on column public.products.image_version is
  'Se actualiza automáticamente cuando cambia image_url. El frontend la usa como parametro ?v= en la URL de la imagen para invalidar la cache obsoleta del navegador.';

create or replace function public.bump_image_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if tg_table_name = 'merchants' then
    if new.logo_url is distinct from old.logo_url
       or new.banner_url is distinct from old.banner_url then
      new.image_version = now();
    end if;
  elsif tg_table_name = 'products' then
    if new.image_url is distinct from old.image_url then
      new.image_version = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists merchants_bump_image_version on public.merchants;
create trigger merchants_bump_image_version
  before update on public.merchants
  for each row execute function public.bump_image_version();

drop trigger if exists products_bump_image_version on public.products;
create trigger products_bump_image_version
  before update on public.products
  for each row execute function public.bump_image_version();
