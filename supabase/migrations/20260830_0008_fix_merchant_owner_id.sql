-- Migración: Diagnóstico y corrección del owner_id en merchants
--
-- Problema: merchantService.ts creaba merchants con owner_id = '' (vacío),
-- por lo que fetchMerchantIds() no encontraba ningún comercio para el usuario.
-- Esta migración:
-- 1. Muestra merchants con owner_id vacío o que no coincide con ningún perfil
-- 2. Permite actualizar el owner_id manualmente
-- 3. Muestra merchants vinculados correctamente a merchant_owner

-- ============================================================
-- PARTE 1: Diagnóstico — merchants con owner_id roto o vacío
-- ============================================================

-- 1a. Merchants con owner_id vacío o NULL
SELECT
  'MERCHANTS_SIN_OWNER' AS diagnostico,
  m.id AS merchant_id,
  m.name AS merchant_name,
  m.owner_id,
  m.status,
  m.is_active
FROM public.merchants m
WHERE m.owner_id IS NULL
   OR m.owner_id = ''
   OR m.owner_id NOT IN (SELECT id FROM public.profiles);

-- 1b. Merchants cuyo owner_id apunta a un perfil con rol incorrecto
SELECT
  'OWNER_ROLE_INCORRECTO' AS diagnostico,
  m.id AS merchant_id,
  m.name AS merchant_name,
  m.owner_id,
  p.role AS owner_role,
  p.email AS owner_email
FROM public.merchants m
JOIN public.profiles p ON p.id = m.owner_id
WHERE p.role != 'merchant_owner';

-- 1c. Merchants vinculados correctamente (merchant_owner)
SELECT
  'OWNER_CORRECTO' AS diagnostico,
  m.id AS merchant_id,
  m.name AS merchant_name,
  m.owner_id,
  p.role AS owner_role,
  p.email AS owner_email,
  m.is_active
FROM public.merchants m
JOIN public.profiles p ON p.id = m.owner_id
WHERE p.role = 'merchant_owner';

-- 1d. Profiles con rol merchant_owner que NO tienen merchant vinculado
SELECT
  'OWNER_SIN_MERCHANT' AS diagnostico,
  p.id AS profile_id,
  p.email,
  p.role,
  p.full_name
FROM public.profiles p
WHERE p.role = 'merchant_owner'
  AND p.id NOT IN (SELECT owner_id FROM public.merchants WHERE owner_id IS NOT NULL);

-- ============================================================
-- PARTE 2: Corrección — ejecutar con cuidado
-- ============================================================

-- Para vincular un merchant a un usuario específico:
-- Reemplaza '<MERCHANT_ID>' y '<USER_ID>' con los valores reales.
--
-- Paso 1: Verificar que el perfil tiene el rol correcto
-- UPDATE public.profiles
-- SET role = 'merchant_owner'
-- WHERE id = '<USER_ID>' AND role != 'merchant_owner';
--
-- Paso 2: Asignar el owner_id del merchant
-- UPDATE public.merchants
-- SET owner_id = '<USER_ID>'
-- WHERE id = '<MERCHANT_ID>';
