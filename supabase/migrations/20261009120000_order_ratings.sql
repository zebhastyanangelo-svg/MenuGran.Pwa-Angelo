-- Encuestas de satisfacción post-pedido (negocio, delivery y plataforma).
--
-- Una fila por pedido (UNIQUE order_id): el cliente la llena una sola vez
-- desde el modal secuencial que aparece tras la entrega. Las estrellas del
-- negocio alimentan el medidor de popularidad del comercio y su visibilidad
-- en el marketplace; las del repartidor alimentan las alertas de calificación
-- negativa (push al superadmin y al dueño del comercio).

CREATE TABLE IF NOT EXISTS public.order_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Calificación del negocio (siempre requerida en la encuesta).
    merchant_stars SMALLINT NOT NULL CHECK (merchant_stars BETWEEN 1 AND 5),
    merchant_speed TEXT NOT NULL CHECK (merchant_speed IN ('normal', 'rapido', 'muy_rapido')),
    merchant_service_quality TEXT NOT NULL CHECK (merchant_service_quality IN ('normal', 'bueno', 'muy_bueno')),

    -- Calificación del repartidor (solo pedidos de delivery con repartidor).
    driver_stars SMALLINT CHECK (driver_stars BETWEEN 1 AND 5),
    driver_speed TEXT CHECK (driver_speed IN ('normal', 'rapido', 'muy_rapido')),
    driver_treatment TEXT CHECK (driver_treatment IN ('normal', 'bueno', 'muy_bueno')),

    -- Calificación de la plataforma MenuGran (siempre requerida).
    platform_stars SMALLINT NOT NULL CHECK (platform_stars BETWEEN 1 AND 5),
    -- Opciones de mejora seleccionadas (JSONB: array de claves, ej. 'interfaz').
    platform_improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Comentario abierto; con la opción 'otro' el cliente detalla aquí.
    platform_comment TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_ratings_merchant
    ON public.order_ratings(merchant_id);

CREATE INDEX IF NOT EXISTS idx_order_ratings_driver
    ON public.order_ratings(driver_id) WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_ratings_customer
    ON public.order_ratings(customer_id);

-- RLS para order_ratings
ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;

-- Solo el cliente del pedido entregado puede registrar la encuesta, y solo
-- una vez (UNIQUE order_id). El pedido debe estar entregado y pertenecerle.
CREATE POLICY "customer_insert_own_order_rating"
    ON public.order_ratings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        customer_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND o.customer_id = auth.uid()
              AND o.status = 'delivered'
        )
    );

-- Las calificaciones son información pública de reputación (como las
-- reseñas): alimentan el medidor de popularidad del marketplace y los
-- paneles de métricas. El comentario libre es el único campo sensible y se
-- publica junto a la reseña, igual que en cualquier plataforma de reviews.
CREATE POLICY "anyone_view_order_ratings"
    ON public.order_ratings
    FOR SELECT
    TO public
    USING (true);
