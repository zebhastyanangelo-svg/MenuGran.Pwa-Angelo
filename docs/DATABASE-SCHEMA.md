# Esquema Relacional de Base de Datos (PostgreSQL)

```sql
-- ENUMS DEL SISTEMA
CREATE TYPE user_role AS ENUM (
    'superadmin', 
    'merchant_owner', 
    'merchant_staff', 
    'driver', 
    'customer'
);

CREATE TYPE merchant_status AS ENUM (
    'pending_approval', 
    'active', 
    'suspended', 
    'rejected'
);

CREATE TYPE order_type AS ENUM (
    'in_store', 
    'pickup', 
    'delivery'
);

CREATE TYPE payment_method AS ENUM (
    'cash', 
    'pago_movil', 
    'zelle', 
    'card'
);

CREATE TYPE order_status AS ENUM (
    'payment_pending', 
    'confirmed', 
    'preparing', 
    'ready', 
    'on_the_way', 
    'delivered', 
    'cancelled'
);

CREATE TYPE delivery_status AS ENUM (
    'unassigned', 
    'assigned', 
    'picking_up', 
    'on_the_way', 
    'delivered', 
    'failed'
);

-- TABLA PERFILES (AUTH EXTENDED)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'customer'::user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TABLA COMERCIOS (MULTI-TENANT)
CREATE TABLE public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
     status merchant_status DEFAULT 'pending_approval'::merchant_status NOT NULL,
     verification_docs JSONB DEFAULT '{}'::jsonb NOT NULL,
     is_active BOOLEAN DEFAULT TRUE NOT NULL,
     is_open BOOLEAN DEFAULT TRUE NOT NULL,
     location POINT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TABLA EMPLEADOS DEL NEGOCIO
CREATE TABLE public.merchant_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"can_manage_menu": false, "can_view_orders": true}'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(merchant_id, user_id)
);

-- TABLA CATEGORIAS
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TABLA PRODUCTOS
CREATE TABLE public.products (
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

-- TABLA PEDIDOS (ORDERS)
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type order_type DEFAULT 'delivery'::order_type NOT NULL,
    status order_status DEFAULT 'payment_pending'::order_status NOT NULL,
    payment_method payment_method NOT NULL,
    payment_reference TEXT,
    payment_proof_url TEXT,
    total_amount DECIMAL(10, 2) NOT NULL,
    table_number TEXT,
    delivery_location POINT,
    delivery_address_notes TEXT,
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TABLA REPARTOS (DELIVERIES)
CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status delivery_status DEFAULT 'unassigned'::delivery_status NOT NULL,
    current_location POINT,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDICES DE RENDIMIENTO
CREATE UNIQUE INDEX idx_merchants_slug ON public.merchants(slug) WHERE status = 'active';
CREATE INDEX idx_products_merchant_category ON public.products(merchant_id, category_id);
CREATE INDEX idx_orders_merchant_status ON public.orders(merchant_id, status, created_at DESC);
CREATE INDEX idx_deliveries_driver ON public.deliveries(driver_id, status);