-- Promociones y señales visuales configurables por el comercio.
--
-- Objetivo: que todo lo que la nueva línea visual muestra como "badge",
-- "descuento" o "tiempo estimado" venga de la base de datos y lo administre
-- el comercio desde su panel, en lugar de estar fijo en el código.
--
-- 1. `merchants.promo_label`               etiqueta flotante del comercio
--                                          (ej. '2x1', 'Envío gratis').
-- 2. `merchants.discount_percentage`       descuento del comercio (1-100).
-- 3. `merchants.estimated_delivery_minutes` tiempo base de preparación, en
--                                          minutos. Las tarjetas muestran el
--                                          rango `base` .. `base + 10`.
-- 4. `products.badge_label`                distintivo del plato
--                                          (ej. 'Más vendido', 'Nuevo').
-- 5. `products.discount_percentage`        descuento del plato (1-100).
-- 6. `orders.customer_tax_id`              RIF/cédula del comprobante fiscal
--                                          que el cliente declara en el
--                                          checkout (opcional).
--
-- No se requieren políticas nuevas: `merchants`, `products` y `orders` ya
-- tienen RLS y las políticas existentes son de fila (no de columna), por lo
-- que las columnas nuevas heredan los permisos actuales. Los CHECK limitan
-- los valores para que el frontend nunca pueda persistir un badge inválido.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS promo_label TEXT,
  ADD COLUMN IF NOT EXISTS discount_percentage SMALLINT
    CHECK (discount_percentage IS NULL OR discount_percentage BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS estimated_delivery_minutes SMALLINT
    CHECK (
      estimated_delivery_minutes IS NULL
      OR estimated_delivery_minutes BETWEEN 1 AND 240
    );

COMMENT ON COLUMN public.merchants.promo_label IS
  'Etiqueta promocional flotante del comercio (ej. ''2x1'', ''Envío gratis''). NULL si no aplica.';
COMMENT ON COLUMN public.merchants.discount_percentage IS
  'Descuento porcentual del comercio (1-100). NULL si no ofrece descuento.';
COMMENT ON COLUMN public.merchants.estimated_delivery_minutes IS
  'Tiempo base de preparación en minutos (1-240). Las tarjetas muestran el rango base..base+10. NULL si no se configuró.';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS badge_label TEXT,
  ADD COLUMN IF NOT EXISTS discount_percentage SMALLINT
    CHECK (discount_percentage IS NULL OR discount_percentage BETWEEN 1 AND 100);

COMMENT ON COLUMN public.products.badge_label IS
  'Distintivo del plato (ej. ''Más vendido'', ''Nuevo'', ''2x1''). NULL si no aplica.';
COMMENT ON COLUMN public.products.discount_percentage IS
  'Descuento porcentual del plato (1-100). NULL si no tiene descuento.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_tax_id TEXT;

COMMENT ON COLUMN public.orders.customer_tax_id IS
  'RIF o cédula declarada por el cliente para el comprobante fiscal. NULL si no se solicitó.';

-- Índice parcial para surfear los comercios con promoción configurada sin
-- penalizar los que no la tienen.
CREATE INDEX IF NOT EXISTS idx_merchants_with_promo
  ON public.merchants (discount_percentage DESC NULLS LAST)
  WHERE discount_percentage IS NOT NULL OR promo_label IS NOT NULL;