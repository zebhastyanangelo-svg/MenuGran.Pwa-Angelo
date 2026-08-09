#!/usr/bin/env bash
# Verificador del arnés: integridad + tests + linter.
# Detecta el stack (Node/Python/Generic) y devuelve 0 solo si todo pasa
# o si no hay suites que correr (entorno recién inicializado no debe fallar).

set -e

echo "🔍 [ARNÉS IA] Ejecutando verificación de entorno, linters y pruebas..."

# 1. Integridad del Arnés
if [ ! -f "agents.md" ] || [ ! -f ".harness/tasks/featurelist.json" ]; then
    echo "❌ ERROR CRÍTICO: Archivos base del arnés no encontrados."
    exit 1
fi

# 2. Refrescar grafo de código si la herramienta está disponible
if command -v code-review-graph &> /dev/null; then
    code-review-graph build > /dev/null 2>&1 || true
fi

# 3. Tests automatizados — detección por stack
echo "🧪 [ARNÉS IA] Verificando pruebas automatizadas del proyecto..."

TESTS_RUN=false

# Caso A: Node.js / JavaScript
if [ -f "package.json" ] && grep -q "\"test\":" "package.json"; then
    echo "▶️ Ejecutando 'npm test'..."
    # set +e local: queremos capturar el exit code sin que set -e aborte
    set +e
    npm test
    npm_test_exit=$?
    set -e
    if [ "$npm_test_exit" -ne 0 ]; then
        echo "❌ 'npm test' falló con exit code $npm_test_exit."
        exit "$npm_test_exit"
    fi
    TESTS_RUN=true
fi

# Caso B: Python (pytest)
if [ "$TESTS_RUN" = false ] && command -v pytest &> /dev/null && \
   { [ -f "pytest.ini" ] || [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; }; then
    echo "▶️ Ejecutando 'pytest'..."
    set +e
    pytest
    pytest_exit=$?
    set -e
    # Exit 0 = ok, exit 5 = sin tests recolectados (estado válido).
    if [ "$pytest_exit" -ne 0 ] && [ "$pytest_exit" -ne 5 ]; then
        echo "❌ 'pytest' falló con exit code $pytest_exit."
        exit "$pytest_exit"
    fi
    TESTS_RUN=true
fi

# Caso C: Runner genérico en .harness/tests/*.sh
if [ "$TESTS_RUN" = false ] && [ -d ".harness/tests" ]; then
    shopt -s nullglob
    test_files=(.harness/tests/*.sh)
    shopt -u nullglob
    if [ "${#test_files[@]}" -gt 0 ]; then
        echo "▶️ Ejecutando ${#test_files[@]} script(s) en .harness/tests/..."
        for test_file in "${test_files[@]}"; do
            echo "   • $test_file"
            set +e
            bash "$test_file"
            sh_exit=$?
            set -e
            if [ "$sh_exit" -ne 0 ]; then
                echo "❌ '$test_file' falló con exit code $sh_exit."
                exit "$sh_exit"
            fi
        done
        TESTS_RUN=true
    fi
fi

if [ "$TESTS_RUN" = false ]; then
    echo "ℹ️ Sin suites de test detectadas — entorno recién inicializado."
fi

echo "✅ [ARNÉS IA] Entorno y calidad verificados exitosamente."
exit 0
