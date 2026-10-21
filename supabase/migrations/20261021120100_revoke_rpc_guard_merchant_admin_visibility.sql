-- 20261021120100_revoke_rpc_guard_merchant_admin_visibility.sql
-- Endurece guard_merchant_admin_visibility: es una función de trigger y no
-- debe ser invocable directamente vía RPC por usuarios autenticados (aviso
-- 0029_authenticated_security_definer_function_executable del linter de
-- seguridad de Supabase). Los triggers no requieren el privilegio EXECUTE
-- para dispararse — mismo tratamiento que guard_profile_role_change.

REVOKE ALL ON FUNCTION public.guard_merchant_admin_visibility()
  FROM PUBLIC, anon, authenticated;
