-- Ingredientes por platillo y personalización interactiva en el checkout.
--
-- Objetivo: que el comercio declare los ingredientes de cada plato como lista
-- editable y que el cliente pueda excluirlos (tacharlos) antes de pagar, sin
-- que la cocina prepare algo distinto de lo pedido.
--
-- 1. `products.ingredients`  lista JSONB de strings (ej.
--                              `["Queso", "Cebolla", "Jamón"]`). El comercio la
--                              administra desde el formulario de platillos y el
--                              texto se normaliza a "Primera Mayúscula" antes de
--                              guardarse.
-- 2. `orders.items[].excluded_ingredients`
--                              El checkout no necesita columna nueva: los
--                              ítems viven en el JSONB `orders.items`, así que la
--                              exclusión viaja dentro de cada objeto del array.
--                              Solo se escribe cuando el cliente tachó algo, para
--                              no ensuciar los pedidos sin personalización.
--
-- No se requieren políticas nuevas: `products` ya tiene RLS por fila y la
-- columna nueva hereda los permisos actuales.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ingredients JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.ingredients IS
  'Lista JSONB de strings con los ingredientes del plato (ej. ["Queso", "Cebolla"]). El cliente puede excluir algunos en el checkout. Array vacío si no se configuraron.';

-- Postgres no admite subconsultas dentro de un CHECK, así que la validación
-- "solo strings no vacíos" vive en una función inmutable. `search_path` queda
-- vacío (pg_catalog se resuelve implícitamente primero) para que un rol con
-- permisos de creación de esquemas no pueda secuestrar la resolución.
CREATE OR REPLACE FUNCTION public.products_ingredients_valid(value jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
  SELECT jsonb_typeof(value) = 'array'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(value) AS element
      WHERE jsonb_typeof(element) <> 'string'
         OR btrim(element #>> '{}') = ''
    );
$$;

COMMENT ON FUNCTION public.products_ingredients_valid(jsonb) IS
  'true si el JSONB es un array cuyos elementos son strings no vacíos. Usada por el CHECK de products.ingredients.';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_ingredients_are_strings;

ALTER TABLE public.products
  ADD CONSTRAINT products_ingredients_are_strings CHECK (
    public.products_ingredients_valid(ingredients)
  );