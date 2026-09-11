-- 20260910_0002_sync_driver_role_existing_data.sql
-- Migra registros existentes de merchant_staff que deberían tener role = 'driver'
-- pero aún tienen el rol por defecto 'merchant_staff'.
--
-- Esto aplica a empleados creados antes de la migración 20260909_0017
-- que agregaba la columna role a merchant_staff.
--
-- Regla: Si el usuario tiene can_view_assigned_deliveries: true en sus
-- permisos, su merchant_staff.role debe ser 'driver'.

UPDATE public.merchant_staff
SET role = 'driver'
WHERE permissions ->> 'can_view_assigned_deliveries' = 'true'
  AND role <> 'driver';

-- También asegurar que los perfiles asociados tengan el rol correcto
-- para compatibilidad con queries que hacen JOIN a profiles
UPDATE public.profiles
SET role = 'driver'
WHERE id IN (
    SELECT user_id
    FROM public.merchant_staff
    WHERE permissions ->> 'can_view_assigned_deliveries' = 'true'
      AND role = 'driver'
)
AND role <> 'driver';
