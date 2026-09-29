-- Endurece las funciones de trigger fijando search_path, según la
-- recomendación del linter de seguridad de Supabase
-- (function_search_path_mutable). Evita que un rol con permisos de creación
-- de esquemas pueda secuestrar la resolución de la tabla `merchants` dentro
-- de enforce_delivery_radius() y demás funciones ejecutadas por triggers.
ALTER FUNCTION public.enforce_delivery_radius() SET search_path TO 'public';
ALTER FUNCTION public.guard_profile_role_change() SET search_path TO 'public';
