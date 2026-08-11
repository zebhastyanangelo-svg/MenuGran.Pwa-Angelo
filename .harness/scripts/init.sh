#!/usr/bin/env bash
# Verificador del arnés: integridad + type-check + lint + build + tests.
# Detecta el stack (Node/Python/Generic) y devuelve 0 solo si todo pasa
# o si no hay suites que correr (entorno recién inicializado no debe fallar).
#
# Para el stack Node.js, además ejecuta:
#   - tsc -b     (chequeo de tipos)
#   - oxlint     (análisis estático)
#   - npm run build (compilación de producción contra dist/)
# Estos checks son obligatorios por TASK-018 y deben pasar con exit code 0.

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

# 3. Type-check, lint y build (stack Node.js)
if [ -f "package.json" ] && grep -q "\"test\":" "package.json"; then
    # Type-check con TypeScript
    if [ -f "tsconfig.json" ]; then
        echo "▶️ Ejecutando 'tsc -b' (type-check)..."
        set +e
        npx tsc -b
        tsc_exit=$?
        set -e
        if [ "$tsc_exit" -ne 0 ]; then
            echo "❌ 'tsc -b' falló con exit code $tsc_exit."
            exit "$tsc_exit"
        fi
    fi

    # Linter estático (oxlint/prettier/eslint — el primero disponible)
    if [ -f "package.json" ] && grep -q '"lint":' "package.json"; then
        echo "▶️ Ejecutando linting estático..."
        set +e
        npm run lint
        lint_exit=$?
        set -e
        if [ "$lint_exit" -ne 0 ]; then
            echo "❌ 'npm run lint' falló con exit code $lint_exit."
            exit "$lint_exit"
        fi
    fi

    # Build de producción
    if [ -f "package.json" ] && grep -q '"build":' "package.json"; then
        echo "▶️ Ejecutando 'npm run build' (compilación de producción)..."
        set +e
        npm run build
        build_exit=$?
        set -e
        if [ "$build_exit" -ne 0 ]; then
            echo "❌ 'npm run build' falló con exit code $build_exit."
            exit "$build_exit"
        fi
        echo "   ✅ Build completado. Contenido de dist/:"
        ls -1 dist/ 2>/dev/null | head -20 | sed 's/^/      /'
    fi

    # 4. Tests automatizados
    echo "🧪 [ARNÉS IA] Verificando pruebas automatizadas del proyecto..."
    echo "▶️ Ejecutando 'npm test'..."
    set +e
    npm test
    npm_test_exit=$?
    set -e
    if [ "$npm_test_exit" -ne 0 ]; then
        echo "❌ 'npm test' falló con exit code $npm_test_exit."
        exit "$npm_test_exit"
    fi
else
    # 4b. Tests automatizados — detección por stack (fallback)
    echo "🧪 [ARNÉS IA] Verificando pruebas automatizadas del proyecto..."

    TESTS_RUN=false

    # Caso B: Python (pytest)
    if command -v pytest &> /dev/null && \
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
fi

echo "✅ [ARNÉS IA] Entorno y calidad verificados exitosamente."
exit 0
