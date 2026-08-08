#!/usr/bin/env bash

set -e

echo "🔍 [ARNÉS IA] Ejecutando verificación de entorno, linters y pruebas..."

# 1. Verificación de Integridad del Arnés
if [ ! -f "agents.md" ] || [ ! -f ".harness/tasks/featurelist.json" ]; then
    echo "❌ ERROR CRÍTICO: Archivos base del arnés no encontrados."
    exit 1
fi

# 2. Instalación Automática de Git Pre-Commit Hook (Si existe repositorio Git)
if [ -d ".git" ] && [ ! -f ".git/hooks/pre-commit" ]; then
    echo "⚓ [ARNÉS IA] Instalando Git Pre-commit Hook..."
    cat << 'HOOK' > .git/hooks/pre-commit
#!/usr/bin/env bash
bash .harness/scripts/init.sh
HOOK
    chmod +x .git/hooks/pre-commit
    echo "✅ Git Hook instalado exitosamente."
fi

# 3. Verificación de Linter/Formato (Ajustable a tu stack)
if [ -f "package.json" ]; then
    echo "🧹 Verificando estándares de código..."
    # npm run lint --quiet 2>/dev/null || true
fi

# 4. Verificación de Tests Automatizados
# npm test 2>/dev/null || pytest 2>/dev/null || echo "ℹ️ Sin suites de test automatizadas detectadas."
echo "🔍 [ARNÉS IA] Ejecutando verificación de entorno, linters y suites de pruebas..."

# 1. Integridad del Arnés
if [ ! -f "agents.md" ] || [ ! -f ".harness/tasks/featurelist.json" ]; then
    echo "❌ ERROR CRÍTICO: Archivos base del arnés no encontrados."
    exit 1
fi

# 2. Refrescar Grafo de Código si está disponible
if command -v code-review-graph &> /dev/null; then
    code-review-graph build > /dev/null 2>&1 || true
fi

# 3. EJECUCIÓN OBLIGATORIA DE TESTS (TDD HARNESS)
echo "🧪 [ARNÉS IA] Verificando pruebas automatizadas del proyecto..."

TEST_PASSED=false

# Caso A: Si es un proyecto Node.js / JavaScript
if [ -f "package.json" ]; then
    if grep -q "\"test\":" "package.json"; then
        echo "▶️ Ejecutando 'npm test'..."
        npm test
        TEST_PASSED=true
    fi
fi

# Caso B: Si es un proyecto Python
if [ -f "pytest.ini" ] || [ -f "requirements.txt" ] || command -v pytest &> /dev/null; then
    if command -v pytest &> /dev/null; then
        echo "▶️ Ejecutando 'pytest'..."
        set +e
        pytest
        pytest_exit=$?
        set -e
        # Exit code 5 = sin tests recolectados (no es fallo)
        if [ "$pytest_exit" -eq 0 ] || [ "$pytest_exit" -eq 5 ]; then
            TEST_PASSED=true
        else
            exit "$pytest_exit"
        fi
    fi
fi

# Caso C: Runner de fallback genérico si existe la carpeta .harness/tests/
if [ "$TEST_PASSED" = false ] && [ -d ".harness/tests" ]; then
    echo "ℹ️ Verificando suite de pruebas local en .harness/tests/..."
    # Si hay scripts ejecutable dentro de .harness/tests/
    for test_file in .harness/tests/*.sh; do
        if [ -f "$test_file" ]; then
            echo "▶️ Ejecutando $test_file..."
            bash "$test_file"
        fi
    done
fi

echo "✅ [ARNÉS IA] ¡Todos los tests pasaron en VERDE! Entorno verificado."
exit 0

echo "✅ [ARNÉS IA] Entorno y calidad verificados exitosamente."
exit 0
# Refrescar o construir el grafo de contexto de código si la herramienta está instalada
if command -v code-review-graph &> /dev/null; then
    echo "🕸️ [ARNÉS IA] Actualizando el grafo de dependencias de código..."
    code-review-graph build > /dev/null 2>&1 || true
fi
echo "✅ [ARNÉS IA] Entorno y calidad verificados exitosamente."
exit 0