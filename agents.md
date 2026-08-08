## 4. CICLO DE IMPLEMENTACIÓN Y VERIFICACIÓN DE BUENAS PRÁCTICAS
Al escribir o modificar código, el agente DEBE:

1. **Consultar Estándares:** Leer `.harness/rules/conventions.md` y `.harness/rules/architecture.md`.
2. **Implementar Código Limpio:** Aplicar principios SOLID, manejo de excepciones y modularidad.
3. **Verificar Calidad Local:**
   * Ejecutar el linter/formateador disponible en el proyecto.
   * Crear o actualizar tests unitarios para la lógica nueva.
   * Ejecutar `bash .harness/scripts/init.sh`.
4. **Verificación Anti-Alucinación:** Si el agente utiliza una librería externa nueva, debe verificar primero que la sintaxis o métodos existan en la versión instalada en el proyecto (`package.json` / `requirements.txt`).
5. **REGLA ABSOLUTA:** Si los tests o el script de calidad fallan, la tarea NO se marca como `"done"`.
## REGLA DE ORO TDD (TEST-DRIVEN DEVELOPMENT)
1. Antes de escribir código, verifica qué test está fallando ejecutando `bash .harness/scripts/init.sh`.
2. Escribe únicamente el código necesario para hacer que ese test pase de **ROJO** a **VERDE**.
3. Si creas una nueva funcionalidad, **DEBES escribir su correspondiente prueba automatizada** (en `*.test.js`, `test_*.py` o en la suite de tests del proyecto).
4. JAMÁS cierres una tarea o la marques como `"done"` si el comando `bash .harness/scripts/init.sh` devuelve un código de error (exit code != 0).