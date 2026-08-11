-- MenuGram — Esquema inicial (2026-08-11)
-- Fuente: docs/DATABASE-SCHEMA.md (enums, tablas, índices)
-- + RLS (arquitectura), trigger de perfil, bucket de comprobantes y Realtime.

-- ============================================================
-- 1. ENUMS DEL SISTEMA
-- ============================================================
DO $$
BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'superadmin', 'merchant_owner', 'merchant_staff', 'driver', 'customer'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.merchant_status AS ENUM (
        'pending_approval', 'active', 'suspended', 'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.order_type AS ENUM ('in_store', 'pickup', 'delivery');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.payment_method AS ENUM (
        'cash', 'pago_movil', 'zelle', 'card'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.order_status AS ENUM (
        'payment_pending', 'confirmed', 'preparing', 'ready',
        'on_the_way', 'delivered', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.delivery_status AS ENUM (
        'unassigned', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'failed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. TABLAS (según docs/DATABASE-SCHEMA.md)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role public.user_role DEFAULT 'customer'::public.user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    status public.merchant_status DEFAULT 'pending_approval'::public.merchant_status NOT NULL,
    verification_docs JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    location POINT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.merchant_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"can_manage_menu": false, "can_view_orders": true}'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(merchant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type public.order_type DEFAULT 'delivery'::public.order_type NOT NULL,
    status public.order_status DEFAULT 'payment_pending'::public.order_status NOT NULL,
    payment_method public.payment_method NOT NULL,
    payment_reference TEXT,
    payment_proof_url TEXT,
    total_amount DECIMAL(10, 2) NOT NULL,
    table_number TEXT,
    delivery_location POINT,
    delivery_address_notes TEXT,
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status public.delivery_status DEFAULT 'unassigned'::public.delivery_status NOT NULL,
    current_location POINT,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- 3a. Auto-crear perfil al registrarse en Auth (flujo login/registro)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3b. Mantener updated_at en tablas que lo declaran
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS deliveries_set_updated_at ON public.deliveries;
CREATE TRIGGER deliveries_set_updated_at
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. ÍNDICES DE RENDIMIENTO (docs/DATABASE-SCHEMA.md)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_slug
    ON public.merchants(slug) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_merchant_category
    ON public.products(merchant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_status
    ON public.orders(merchant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver
    ON public.deliveries(driver_id, status);

-- ============================================================
-- 5. ROW LEVEL SECURITY (arquitectura: RLS en Postgres)
-- ============================================================

-- Función auxiliar para RLS: staff activo o dueño del comercio
-- (SECURITY DEFINER: evita recursión de políticas sobre merchants/merchant_staff)
CREATE OR REPLACE FUNCTION public.is_merchant_staff_or_owner(target_merchant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = target_merchant_id
          AND (
            m.owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.merchant_staff ms
                WHERE ms.merchant_id = m.id
                  AND ms.user_id = auth.uid()
                  AND ms.is_active = true
            )
          )
    );
$$;

-- Función auxiliar para RLS: únicamente el dueño del comercio
-- (SECURITY DEFINER: evita recursión de políticas sobre merchants)
CREATE OR REPLACE FUNCTION public.is_merchant_owner(target_merchant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = target_merchant_id
          AND m.owner_id = auth.uid()
    );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- --- profiles ---
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- --- merchants ---
DROP POLICY IF EXISTS merchants_select_public ON public.merchants;
CREATE POLICY merchants_select_public ON public.merchants
    FOR SELECT TO anon, authenticated
    USING (status = 'active' AND is_active = true);
DROP POLICY IF EXISTS merchants_select_owner ON public.merchants;
CREATE POLICY merchants_select_owner ON public.merchants
    FOR SELECT USING (owner_id = auth.uid());
DROP POLICY IF EXISTS merchants_select_staff ON public.merchants;
CREATE POLICY merchants_select_staff ON public.merchants
    FOR SELECT USING (public.is_merchant_staff_or_owner(merchants.id));
DROP POLICY IF EXISTS merchants_insert_owner ON public.merchants;
CREATE POLICY merchants_insert_owner ON public.merchants
    FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS merchants_update_owner ON public.merchants;
CREATE POLICY merchants_update_owner ON public.merchants
    FOR UPDATE USING (owner_id = auth.uid());
DROP POLICY IF EXISTS merchants_delete_owner ON public.merchants;
CREATE POLICY merchants_delete_owner ON public.merchants
    FOR DELETE USING (owner_id = auth.uid());

-- --- merchant_staff ---
DROP POLICY IF EXISTS staff_select_own ON public.merchant_staff;
CREATE POLICY staff_select_own ON public.merchant_staff
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.is_merchant_owner(merchant_staff.merchant_id)
    );
DROP POLICY IF EXISTS staff_insert_owner ON public.merchant_staff;
CREATE POLICY staff_insert_owner ON public.merchant_staff
    FOR INSERT WITH CHECK (public.is_merchant_owner(merchant_staff.merchant_id));
DROP POLICY IF EXISTS staff_update_owner ON public.merchant_staff;
CREATE POLICY staff_update_owner ON public.merchant_staff
    FOR UPDATE USING (public.is_merchant_owner(merchant_staff.merchant_id));
DROP POLICY IF EXISTS staff_delete_owner ON public.merchant_staff;
CREATE POLICY staff_delete_owner ON public.merchant_staff
    FOR DELETE USING (public.is_merchant_owner(merchant_staff.merchant_id));

-- --- categories (catálogo público; gestión solo del comercio) ---
DROP POLICY IF EXISTS categories_select_public ON public.categories;
CREATE POLICY categories_select_public ON public.categories
    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS categories_insert_merchant ON public.categories;
CREATE POLICY categories_insert_merchant ON public.categories
    FOR INSERT WITH CHECK (public.is_merchant_staff_or_owner(merchant_id));
DROP POLICY IF EXISTS categories_update_merchant ON public.categories;
CREATE POLICY categories_update_merchant ON public.categories
    FOR UPDATE USING (public.is_merchant_staff_or_owner(merchant_id));
DROP POLICY IF EXISTS categories_delete_merchant ON public.categories;
CREATE POLICY categories_delete_merchant ON public.categories
    FOR DELETE USING (public.is_merchant_staff_or_owner(merchant_id));

-- --- products ---
DROP POLICY IF EXISTS products_select_public ON public.products;
CREATE POLICY products_select_public ON public.products
    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS products_insert_merchant ON public.products;
CREATE POLICY products_insert_merchant ON public.products
    FOR INSERT WITH CHECK (public.is_merchant_staff_or_owner(merchant_id));
DROP POLICY IF EXISTS products_update_merchant ON public.products;
CREATE POLICY products_update_merchant ON public.products
    FOR UPDATE USING (public.is_merchant_staff_or_owner(merchant_id));
DROP POLICY IF EXISTS products_delete_merchant ON public.products;
CREATE POLICY products_delete_merchant ON public.products
    FOR DELETE USING (public.is_merchant_staff_or_owner(merchant_id));

-- --- orders ---
DROP POLICY IF EXISTS orders_insert_customer ON public.orders;
CREATE POLICY orders_insert_customer ON public.orders
    FOR INSERT WITH CHECK (customer_id = auth.uid());
DROP POLICY IF EXISTS orders_select_customer ON public.orders;
CREATE POLICY orders_select_customer ON public.orders
    FOR SELECT USING (customer_id = auth.uid());
DROP POLICY IF EXISTS orders_select_merchant ON public.orders;
CREATE POLICY orders_select_merchant ON public.orders
    FOR SELECT USING (public.is_merchant_staff_or_owner(merchant_id));
DROP POLICY IF EXISTS orders_update_merchant ON public.orders;
CREATE POLICY orders_update_merchant ON public.orders
    FOR UPDATE USING (public.is_merchant_staff_or_owner(merchant_id));

-- --- deliveries ---
DROP POLICY IF EXISTS deliveries_select_merchant ON public.deliveries;
CREATE POLICY deliveries_select_merchant ON public.deliveries
    FOR SELECT USING (public.is_merchant_staff_or_owner((
        SELECT merchant_id FROM public.orders o WHERE o.id = deliveries.order_id
    )));
DROP POLICY IF EXISTS deliveries_select_driver ON public.deliveries;
CREATE POLICY deliveries_select_driver ON public.deliveries
    FOR SELECT USING (driver_id = auth.uid());
DROP POLICY IF EXISTS deliveries_select_customer ON public.deliveries;
CREATE POLICY deliveries_select_customer ON public.deliveries
    FOR SELECT USING ((SELECT customer_id FROM public.orders o WHERE o.id = deliveries.order_id) = auth.uid());
DROP POLICY IF EXISTS deliveries_insert_merchant ON public.deliveries;
CREATE POLICY deliveries_insert_merchant ON public.deliveries
    FOR INSERT WITH CHECK (public.is_merchant_staff_or_owner((
        SELECT merchant_id FROM public.orders o WHERE o.id = deliveries.order_id
    )));
DROP POLICY IF EXISTS deliveries_update_driver ON public.deliveries;
CREATE POLICY deliveries_update_driver ON public.deliveries
    FOR UPDATE USING (driver_id = auth.uid());
DROP POLICY IF EXISTS deliveries_update_merchant ON public.deliveries;
CREATE POLICY deliveries_update_merchant ON public.deliveries
    FOR UPDATE USING (public.is_merchant_staff_or_owner((
        SELECT merchant_id FROM public.orders o WHERE o.id = deliveries.order_id
    )));

-- ============================================================
-- 6. GRANTS (RLS es la autorización fina; grants cubren el acceso)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ============================================================
-- 7. STORAGE — bucket privado de comprobantes de pago
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS storage_objects_insert_payment_proofs ON storage.objects;
CREATE POLICY storage_objects_insert_payment_proofs ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS storage_objects_select_payment_proofs ON storage.objects;
CREATE POLICY storage_objects_select_payment_proofs ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'payment-proofs');

-- ============================================================
-- 8. REALTIME — órdenes y repartos (OrderTracker / seguimiento)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
