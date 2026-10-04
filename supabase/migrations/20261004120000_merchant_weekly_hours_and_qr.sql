-- Horario de atención semanal por comercio + token del código QR.
--
-- 1. `weekly_hours`: agenda por día de la semana (apertura, cierre y si abre).
-- 2. `qr_token`: identificador estable y revocable del código QR del comercio.
-- 3. `opening_time` / `closing_time`: ya existían en este proyecto (de tipo
--    `time`), así que el `ADD COLUMN IF NOT EXISTS` no hace nada. Se conservan
--    como columnas legacy y se derivan de `weekly_hours` desde el frontend.
--
-- No se requieren políticas nuevas: `merchants` ya tiene RLS y las políticas son
-- de fila (no de columna), por lo que las columnas nuevas heredan los permisos
-- existentes.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS opening_time TEXT,
  ADD COLUMN IF NOT EXISTS closing_time TEXT;

COMMENT ON COLUMN public.merchants.opening_time IS
  'Hora de apertura global. Columna legacy: se deriva de weekly_hours y se mantiene para las vistas que no consultan la agenda.';
COMMENT ON COLUMN public.merchants.closing_time IS
  'Hora de cierre global. Columna legacy: se deriva de weekly_hours y se mantiene para las vistas que no consultan la agenda.';

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS weekly_hours JSONB NOT NULL DEFAULT '{
    "timezone": "America/Caracas",
    "schedule": {
      "monday":    { "is_open": true, "open_time": "08:00", "close_time": "20:00" },
      "tuesday":   { "is_open": true, "open_time": "08:00", "close_time": "20:00" },
      "wednesday": { "is_open": true, "open_time": "08:00", "close_time": "20:00" },
      "thursday":  { "is_open": true, "open_time": "08:00", "close_time": "20:00" },
      "friday":    { "is_open": true, "open_time": "08:00", "close_time": "20:00" },
      "saturday":  { "is_open": true, "open_time": "08:00", "close_time": "20:00" },
      "sunday":    { "is_open": true, "open_time": "08:00", "close_time": "20:00" }
    }
  }'::jsonb;

COMMENT ON COLUMN public.merchants.weekly_hours IS
  'Agenda semanal: { timezone, schedule: { <dia>: { is_open, open_time, close_time } } }. '
  'Un close_time menor que open_time indica horario que cruza la medianoche.';

-- El token se genera en la base para que los comercios existentes y los nuevos
-- tengan uno válido desde el momento de la migración, sin paso de populate.
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS qr_token TEXT DEFAULT gen_random_uuid()::text;

COMMENT ON COLUMN public.merchants.qr_token IS
  'Token publico y estable que codifica el codigo QR del comercio. Regenerable para revocar codigos impresos.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_qr_token
  ON public.merchants(qr_token) WHERE qr_token IS NOT NULL;

-- Relleno retroactivo: replica la hora global ya configurada en los siete
-- dias, para que activar la agenda semanal no cambie el horario que el
-- cliente ya veia.
--
-- `opening_time`/`closing_time` pueden ser `time` (que PostgREST devuelve como
-- "09:00:00") o `text` ("09:00"), por eso se normaliza con `left(..., 5)` en
-- lugar de un regex contra el valor completo: asi "09:00:00" y "09:00"
-- terminan ambos en "09:00" y se validan igual.
UPDATE public.merchants m
SET weekly_hours = jsonb_build_object(
  'timezone', COALESCE(NULLIF(btrim(m.weekly_hours ->> 'timezone'), ''), 'America/Caracas'),
  'schedule', (
    SELECT jsonb_object_agg(
      day.key,
      jsonb_build_object(
        'is_open', true,
        'open_time', left(btrim(m.opening_time::text), 5),
        'close_time', left(btrim(m.closing_time::text), 5)
      )
    )
    FROM unnest(
      ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    ) AS day(key)
  )
)
WHERE NULLIF(btrim(m.opening_time::text), '') IS NOT NULL
  AND NULLIF(btrim(m.closing_time::text), '') IS NOT NULL
  AND left(btrim(m.opening_time::text), 5) ~ '^[0-9]{2}:[0-9]{2}$'
  AND left(btrim(m.closing_time::text), 5) ~ '^[0-9]{2}:[0-9]{2}$';