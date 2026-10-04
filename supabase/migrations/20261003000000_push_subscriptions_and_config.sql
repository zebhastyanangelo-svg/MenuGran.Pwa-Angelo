-- Tabla de suscripciones push de usuarios
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_active_user
    ON public.user_push_subscriptions(user_id) WHERE is_active;

-- Tabla de configuración push (VAPID keys, cron secret)
CREATE TABLE IF NOT EXISTS public.app_push_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    vapid_public_key TEXT NOT NULL,
    vapid_private_key TEXT NOT NULL,
    cron_secret TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS para user_push_subscriptions
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propias suscripciones
CREATE POLICY "users_view_own_subscriptions"
    ON public.user_push_subscriptions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Los usuarios pueden insertar sus propias suscripciones
CREATE POLICY "users_insert_own_subscriptions"
    ON public.user_push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Los usuarios pueden actualizar sus propias suscripciones
CREATE POLICY "users_update_own_subscriptions"
    ON public.user_push_subscriptions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Los usuarios pueden eliminar sus propias suscripciones
CREATE POLICY "users_delete_own_subscriptions"
    ON public.user_push_subscriptions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- RLS para app_push_config (solo service role / superadmin)
ALTER TABLE public.app_push_config ENABLE ROW LEVEL SECURITY;

-- Nadie puede ver la configuración push desde el cliente (solo service role)
-- No se crean políticas para anon/authenticated, lo que significa que solo
-- el service_role (que bypass RLS) puede acceder.
