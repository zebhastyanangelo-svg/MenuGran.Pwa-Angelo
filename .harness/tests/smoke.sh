#!/usr/bin/env bash

# Test de humo base: Comprueba que el proyecto cumple los requisitos mínimos
echo "🧪 Probando salud básica de la aplicación..."

# Ejemplo: Comprobar que existe el archivo de entrada principal o paquete
if [ ! -f "package.json" ] && [ ! -f "index.html" ] && [ ! -f "main.py" ] && [ ! -f "src/index.js" ]; then
    echo "❌ TEST FALLIDO: No se encontró ningún archivo de código fuente principal (index.html, main.py, src/index.js, etc.)."
    exit 1
fi

echo "✅ TEST PASADO: Estructura base de código detectada."
exit 0