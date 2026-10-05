-- Política de envío por comercio + snapshot del costo en el pedido.
--
-- Objetivo: que el dueño del comercio declare si ofrece delivery y, si lo
-- ofrece, si es gratis o tiene un costo adicional. El checkout usa estos dos
-- campos para calcular el total en tiempo real y el marketplace oculta los
-- comercios sin delivery cuando el cliente está en el flujo de delivery.
--
-- 1. `merchants.offers_delivery`   si el comercio presta servicio a domicilio.
--    Por defecto TRUE para no alterar el comportamiento de los comercios ya
--    activos; el commerce lo desactiva explícitamente cuando no tiene repartidor.
-- 2. `merchants.delivery_fee`      costo del envío en USD (misma moneda que
--    `products.price`). 0 = envío gratis.
-- 3. `orders.delivery_fee`         snapshot del costo cobrado al momento de
--    pedir. Se congela en la orden para que un cambio posterior de la tarifa
--    no altere el histórico de lo que el cliente pagó.
--
-- No se requieren políticas nuevas: `merchants` y `orders` ya tienen RLS y las
-- políticas son de fila (no de columna), por lo que las columnas nuevas heredan
-- los permisos existentes.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS offers_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- `offers_delivery` no lleva CHECK: es un NOT NULL BOOLEAN, el tipo ya acota
-- el dominio a {true, false}. `delivery_fee` sí lo lleva para impedir que una
-- escritura (incluida una manipulada desde el cliente) fije un costo negativo.
ALTER TABLE public.merchants
  DROP CONSTRAINT IF EXISTS merchants_delivery_fee_non_negative;
ALTER TABLE public.merchants
  ADD CONSTRAINT merchants_delivery_fee_non_negative CHECK (delivery_fee >= 0);

COMMENT ON COLUMN public.merchants.offers_delivery IS
  'Verdadero si el comercio ofrece delivery a domicilio. Si es falso, el marketplace lo oculta al cliente que eligió el flujo de delivery y el checkout impide elegir entrega.';
COMMENT ON COLUMN public.merchants.delivery_fee IS
  'Costo del delivery en USD (2 decimales, >= 0). 0 significa envío gratis. Solo aplica cuando offers_delivery es verdadero.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_fee_non_negative;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_fee_non_negative CHECK (delivery_fee >= 0);

COMMENT ON COLUMN public.orders.delivery_fee IS
  'Costo de envío cobrado en esta orden (USD), copiado de merchants.delivery_fee al confirmar el pedido. 0 si el envío fue gratis o el pedido fue para retiro.';

-- Índice parcial para el marketplace: solo interessan los comercios activos que
-- además prestan delivery, que es el conjunto que se lista en ese flujo.
CREATE INDEX IF NOT EXISTS idx_merchants_active_with_delivery
  ON public.merchants (is_active, status)
  WHERE offers_delivery = true;