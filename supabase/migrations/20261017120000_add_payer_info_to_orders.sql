-- Datos del pagador (Pago Móvil) en la orden.
--
-- Objetivo: que la caja pueda conciliar una transferencia de Pago Móvil con el
-- emisor real, no solo contra el comprobante que adjunta el cliente.
--
-- 1. `orders.payer_bank`       Nombre canónico del catálogo SUDEBAN del banco
--                              desde el que el cliente transfirió.
-- 2. `orders.payer_phone`      Teléfono asociado a esa transferencia. El banco
--                              lo usa como clave de búsqueda del movimiento.
-- 3. `orders.payer_id_number`  Cédula del titular de la transferencia.
--
-- Las tres son NULL para pedidos con tarjeta, efectivo o para retroactive:
-- el checkout solo las rellena cuando el método de pago es `pago_movil` y el
-- cliente tiene teléfono y cédula en su perfil.
--
-- No se requieren políticas nuevas: el RLS de `orders` es por fila (no por
-- columna), así que
--   - INSERT (`orders_insert_customer`) acepta las columnas nuevas sin cambios,
--     el `WITH CHECK` solo valida `customer_id = auth.uid()`;
--   - SELECT (`orders_select_authorized`) ya expone la fila completa al personal
--     del comercio con `can_view_orders`, que es quien necesita estos datos.
-- `payer_id_number` es PII, pero no amplía la superficie de exposición: el
-- comercio ya puede leer `profiles.ci` del cliente (migración
-- 20260928130000_allow_merchant_view_customer_profiles.sql).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payer_bank TEXT,
  ADD COLUMN IF NOT EXISTS payer_phone TEXT,
  ADD COLUMN IF NOT EXISTS payer_id_number TEXT;

COMMENT ON COLUMN public.orders.payer_bank IS
  'Nombre canónico del banco emisor declarado por el cliente (catálogo SUDEBAN). Solo en pedidos con pago_method = ''pago_movil''.';

COMMENT ON COLUMN public.orders.payer_phone IS
  'Teléfono asociado a la transferencia de Pago Móvil. Clave de búsqueda del movimiento en el banco emisor.';

COMMENT ON COLUMN public.orders.payer_id_number IS
  'Cédula del titular de la transferencia de Pago Móvil, para conciliar contra el banco emisor.';