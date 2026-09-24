-- 0020 — FK en cascada hacia auth.users/profiles + limpieza de datos de prueba.
--
-- PARTE A: las FK que bloqueaban el borrado de usuarios/comercios pasan a
-- CASCADE (o SET NULL donde conservar el registro histórico tiene sentido).
--
-- PARTE B: limpieza de datos de prueba. Se conservan únicamente:
--   - el superadmin del sistema,
--   - todos los usuarios autenticados con Google,
--   - el repartidor buystrom4126@gmail.com (pruebas de delivery).
-- Se eliminan las cuentas @menugram.test (tiendas "Restaurante Demo") y la
-- tienda "comercio" de russotzebhastyanangelo@gmail.com junto con su cuenta.

-- ---------------------------------------------------------------------------
-- PARTE A: Foreign Keys
-- ---------------------------------------------------------------------------

-- Borrar un propietario elimina su comercio (y este, en cascada, su catálogo,
-- personal y pedidos).
alter table public.merchants
  drop constraint if exists merchants_owner_id_fkey;
alter table public.merchants
  add constraint merchants_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete cascade;

-- Borrar un comercio elimina sus pedidos (y estos, en cascada, sus entregas).
alter table public.orders
  drop constraint if exists orders_merchant_id_fkey;
alter table public.orders
  add constraint orders_merchant_id_fkey
  foreign key (merchant_id) references public.merchants(id) on delete cascade;

-- Borrar un repartidor conserva el pedido pero lo deja sin asignar.
alter table public.orders
  drop constraint if exists orders_driver_id_fkey;
alter table public.orders
  add constraint orders_driver_id_fkey
  foreign key (driver_id) references public.profiles(id) on delete set null;

-- Ya existen y se mantienen: profiles.id → auth.users (CASCADE),
-- merchant_staff.user_id → profiles (CASCADE),
-- merchant_staff.merchant_id → merchants (CASCADE),
-- categories/products.merchant_id → merchants (CASCADE),
-- deliveries.order_id → orders (CASCADE),
-- orders.customer_id / deliveries.driver_id → profiles (SET NULL).

-- ---------------------------------------------------------------------------
-- PARTE B: limpieza de cuentas y tiendas de prueba
-- ---------------------------------------------------------------------------
-- El borrado de auth.users se propaga en cascada a profiles, merchants,
-- merchant_staff, orders, deliveries, categories y products. Los pedidos de
-- otros comercios atendidos por un repartidor eliminado quedan con
-- driver_id = NULL en lugar de perderse.
delete from auth.users
where email like '%@menugram.test'
   or email = 'russotzebhastyanangelo@gmail.com';
