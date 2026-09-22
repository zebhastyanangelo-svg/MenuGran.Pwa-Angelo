-- Añade columnas explícitas de dirección y coordenadas de entrega a orders.
-- `delivery_location` (POINT) se mantiene por compatibilidad; estas columnas
-- facilitan lectura directa (repartidor) y sincronización de rastreo.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_address TEXT,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN public.orders.delivery_address IS 'Dirección textual de entrega escrita por el cliente en checkout.';
COMMENT ON COLUMN public.orders.latitude IS 'Latitud del punto de entrega (GeoPoint.y de delivery_location).';
COMMENT ON COLUMN public.orders.longitude IS 'Longitud del punto de entrega (GeoPoint.x de delivery_location).';
