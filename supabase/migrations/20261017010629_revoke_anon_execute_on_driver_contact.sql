REVOKE ALL ON FUNCTION public.customer_driver_contact(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_driver_contact(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.customer_driver_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_driver_contact(uuid) TO service_role;
