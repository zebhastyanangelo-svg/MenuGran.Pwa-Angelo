alter table public.merchants
  add column subscription_expires_at date;

comment on column public.merchants.subscription_expires_at is
  'Fecha de expiración manual de la suscripción del comercio (YYYY-MM-DD), gestionada por el SuperAdmin. NULL = sin plazo configurado. Solo control visual/administrativo, no bloquea nada automáticamente.';
