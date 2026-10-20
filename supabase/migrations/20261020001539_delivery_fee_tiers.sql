-- Tramos de tarifa de delivery por distancia configurados por cada comercio.
--
-- Cada comercio define tramos (min_km, max_km] con un monto fijo en USD. El
-- checkout calcula la distancia al cliente y aplica el tramo correspondiente.
-- Es optativo: si un comercio no tiene tramos, el checkout usa la tarifa plana
-- merchants.delivery_fee.

CREATE TABLE IF NOT EXISTS public.delivery_fee_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    min_km DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    max_km DECIMAL(8, 2) NOT NULL,
    fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT delivery_fee_tiers_min_nonnegative CHECK (min_km >= 0),
    CONSTRAINT delivery_fee_tiers_max_gt_min CHECK (max_km > min_km),
    CONSTRAINT delivery_fee_tiers_fee_nonnegative CHECK (fee >= 0)
);

CREATE INDEX IF NOT EXISTS idx_delivery_fee_tiers_merchant
    ON public.delivery_fee_tiers (merchant_id);

ALTER TABLE public.delivery_fee_tiers ENABLE ROW LEVEL SECURITY;

-- SELECT: los clientes necesitan leer los tramos para calcular el costo en el checkout.
DROP POLICY IF EXISTS delivery_fee_tiers_select_public ON public.delivery_fee_tiers;
CREATE POLICY delivery_fee_tiers_select_public ON public.delivery_fee_tiers
    FOR SELECT TO anon, authenticated USING (true);

-- INSERT/UPDATE/DELETE: solo el comercio (dueño o staff) puede mantener sus tramos.
DROP POLICY IF EXISTS delivery_fee_tiers_insert_merchant ON public.delivery_fee_tiers;
CREATE POLICY delivery_fee_tiers_insert_merchant ON public.delivery_fee_tiers
    FOR INSERT WITH CHECK (private.is_merchant_staff_or_owner(merchant_id));

DROP POLICY IF EXISTS delivery_fee_tiers_update_merchant ON public.delivery_fee_tiers;
CREATE POLICY delivery_fee_tiers_update_merchant ON public.delivery_fee_tiers
    FOR UPDATE USING (private.is_merchant_staff_or_owner(merchant_id))
    WITH CHECK (private.is_merchant_staff_or_owner(merchant_id));

DROP POLICY IF EXISTS delivery_fee_tiers_delete_merchant ON public.delivery_fee_tiers;
CREATE POLICY delivery_fee_tiers_delete_merchant ON public.delivery_fee_tiers
    FOR DELETE USING (private.is_merchant_staff_or_owner(merchant_id));
