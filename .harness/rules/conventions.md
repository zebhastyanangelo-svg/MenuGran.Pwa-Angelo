# ESTÁNDARES Y BUENAS PRÁCTICAS OBLIGATORIAS

## 1. Principios de Código Clean
* **Funciones Pequeñas:** Una función no debe hacer más de una cosa ni superar ~30 líneas de código.
* **Nombres Descriptivos:** Nombres de variables y funciones explícitos en inglés/español (según convención) sin abreviaturas ambiguas.
* **Manejo de Errores:** Bloques `try/catch` o validación explícita de bordes/nulos en todas las funciones públicas.

## 2. Puntos de Verificación de Estilo (Linter & Types)
* Correr linter antes de considerar completado el archivo.
* No utilizar `any` explícito (en TypeScript) ni variables globales no tipadas.
* Formato unificado usando formateador del proyecto (Prettier/Biome/Standard).

## 3. Pruebas y Cobertura
* Toda nueva función lógica/utilidad debe tener su archivo correspondiente de pruebas unitarias (`*.test.js` / `*.test.py`).