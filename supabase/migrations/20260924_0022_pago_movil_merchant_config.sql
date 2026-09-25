-- TASK: Gestión dinámica de Pago Móvil y selección flexible de método de pago.
-- 1. Nuevo método de pago 'card_pos' (Tarjeta / Punto de Venta a la entrega o en caja).
-- 2. Datos dinámicos de Pago Móvil del comercio (banco, cédula/RIF, teléfono),
--    legibles públicamente vía la política existente merchants_select_public.

DO $$
BEGIN
    ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'card_pos';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.merchants
    ADD COLUMN IF NOT EXISTS pago_movil_bank TEXT,
    ADD COLUMN IF NOT EXISTS pago_movil_id_number TEXT,
    ADD COLUMN IF NOT EXISTS pago_movil_phone TEXT;
