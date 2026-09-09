-- 20260909_0017_add_role_to_merchant_staff.sql
-- Añade una columna `role` a merchant_staff para almacenar el rol del
-- empleado dentro del contexto del comercio (merchant_staff | driver).
--
-- La tabla merchant_staff ya no depende únicamente de profiles.role,
-- lo que permite que un usuario tenga roles diferentes por comercio
-- (ej. driver en uno, merchant_staff en otro).

ALTER TABLE public.merchant_staff
    ADD COLUMN IF NOT EXISTS role public.user_role
        DEFAULT 'merchant_staff'::public.user_role
        NOT NULL;

COMMENT ON COLUMN public.merchant_staff.role IS
    'Rol del empleado dentro del comercio: merchant_staff o driver.';
