-- Corrige enforce_delivery_radius(): merchants.location es de tipo POINT nativo
-- de PostgreSQL (serializado como '(lng,lat)'), no JSONB, por lo que los
-- operadores -> / ->> no existen y abortaban todo INSERT de órdenes a
-- domicilio con 42883 "operator does not exist: point -> unknown".
--
-- - lng/lat se extraen parseando la representación textual del POINT.
-- - Se preserva la validación de negocio: comercio sin ubicación o pedido
--   sin coordenadas sigue produciendo el error original.
-- - Se sincroniza orders.delivery_location (POINT) desde latitude/longitude
--   para restaurar la columna canónica en pedidos a domicilio.
CREATE OR REPLACE FUNCTION public.enforce_delivery_radius()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  merch_location_text TEXT;
  merch_lat DOUBLE PRECISION;
  merch_lon DOUBLE PRECISION;
  delivery_lat DOUBLE PRECISION;
  delivery_lon DOUBLE PRECISION;
  dist_meters DOUBLE PRECISION;
BEGIN
  IF NEW.type = 'delivery' THEN
    SELECT m.location::text
      INTO merch_location_text
      FROM public.merchants m
      WHERE m.id = NEW.merchant_id;

    -- POINT se serializa '(lng,lat)': se quitan paréntesis y se divide.
    merch_lon := NULLIF(split_part(TRIM(BOTH '()' FROM merch_location_text), ',', 1), '')::double precision;
    merch_lat := NULLIF(split_part(TRIM(BOTH '()' FROM merch_location_text), ',', 2), '')::double precision;

    IF merch_lat IS NULL OR merch_lon IS NULL THEN
      RAISE EXCEPTION 'Merchant location missing';
    END IF;

    delivery_lat := NEW.latitude;
    delivery_lon := NEW.longitude;
    IF delivery_lat IS NULL OR delivery_lon IS NULL THEN
      RAISE EXCEPTION 'Delivery coordinates missing';
    END IF;

    -- Mantiene la columna POINT canónica sincronizada con lat/lng.
    IF NEW.delivery_location IS NULL THEN
      NEW.delivery_location := point(delivery_lon, delivery_lat);
    END IF;

    -- haversine formula (meters)
    dist_meters := 2 * 6371000 * asin(sqrt(
        pow(sin(radians(delivery_lat - merch_lat) / 2), 2) +
        cos(radians(merch_lat)) * cos(radians(delivery_lat)) *
        pow(sin(radians(delivery_lon - merch_lon) / 2), 2)
    ));

    IF dist_meters > 1000 THEN
      RAISE EXCEPTION 'Ubicación fuera del radio de entrega permitido (máximo 1 km)';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
