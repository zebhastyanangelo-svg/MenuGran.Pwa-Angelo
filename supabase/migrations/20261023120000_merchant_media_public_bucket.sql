-- Bucket público del catálogo: logos, banners y fotos de platos.
--
-- Migración desde ImgBB: las imágenes públicas del catálogo pasan a vivir en
-- Supabase Storage, estructuradas por comercio:
--
--   merchant-media/merchants/<merchant_id>/logo/<archivo>.jpg
--   merchant-media/merchants/<merchant_id>/banner/<archivo>.jpg
--   merchant-media/merchants/<merchant_id>/dish/<archivo>.jpg
--
-- El bucket es público (URLs estables servidas por el CDN) pero la gestión
-- sigue protegida por RLS:
--
--   - SELECT  → público (anon + authenticated): el bucket es público.
--   - INSERT  → cualquier usuario autenticado (registro y edición de catálogo).
--   - DELETE  → el propio usuario que subió el archivo (rollback de un
--               registro fallido o reemplazo de imagen) o el dueño/staff/
--               superadmin del comercio dueño de la carpeta. La eliminación
--               física al reemplazar o borrar platos evita archivos huérfanos.
--
-- El bucket privado `payment-proofs` (comprobantes de pago, con URLs firmadas)
-- NO se toca: el cron de limpieza sigue purgando únicamente ese bucket y este
-- bucket público queda protegido de forma permanente.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-media',
  'merchant-media',
  true,
  5242880, -- 5 MB por archivo (el cliente comprime antes de subir)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 1. SELECT — catálogo público
-- ============================================================
DROP POLICY IF EXISTS storage_objects_select_merchant_media ON storage.objects;
CREATE POLICY storage_objects_select_merchant_media ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'merchant-media');

-- ============================================================
-- 2. INSERT — usuarios autenticados (registro y gestión)
-- ============================================================
DROP POLICY IF EXISTS storage_objects_insert_merchant_media ON storage.objects;
CREATE POLICY storage_objects_insert_merchant_media ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'merchant-media');

-- ============================================================
-- 3. DELETE — sin archivos huérfanos
-- ============================================================
-- Dos vías de borrado:
--   a) el usuario que subió el archivo: `owner_id` (text, lo pobla supabase-js
--      moderno) con fallback al `owner` (uuid) heredado. Cubre el rollback de
--      un registro de comercio que falló a medio camino y el reemplazo de una
--      imagen subida en la sesión actual.
--   b) `merchants/<id>/...`: el dueño, el staff activo o un superadmin del
--      comercio dueño de la carpeta pueden borrar cualquiera de sus imágenes
--      (platos eliminados, logo/banner reemplazado).
--
-- El cast a uuid es intencional: una ruta malformada falla cerrado (la fila
-- no se puede borrar) en lugar de fallar abierto.
DROP POLICY IF EXISTS storage_objects_delete_merchant_media ON storage.objects;
CREATE POLICY storage_objects_delete_merchant_media ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'merchant-media'
        AND (
            coalesce(owner_id, owner::text) = (SELECT auth.uid()::text)
            OR (
                (storage.foldername(name))[1] = 'merchants'
                AND private.is_merchant_staff_or_owner(((storage.foldername(name))[2])::uuid)
            )
        )
    );
