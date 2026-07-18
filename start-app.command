#!/bin/bash

# Moverse al directorio donde está este archivo
cd "$(dirname "$0")"

# Cargar configuración del usuario (por si hace falta Node/NVM)
if [ -f ~/.zshrc ]; then
    source ~/.zshrc 2>/dev/null
fi

clear
echo "=========================================="
echo "  Taski — Iniciando..."
echo "=========================================="

# Matar procesos previos en los puertos
echo "Limpiando puertos..."
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :8080 | xargs kill -9 2>/dev/null
sleep 1

# Iniciar backend Python en background
echo "Iniciando backend (Notion)..."
python3 server.py &
BACKEND_PID=$!

# Iniciar frontend Next.js en background
echo "Iniciando frontend..."
npm run dev > /tmp/taski-frontend.log 2>&1 &
FRONTEND_PID=$!

# Esperar a que Next.js esté listo (máx 60 seg)
echo "Esperando a que la app esté lista..."
READY=0
for i in $(seq 1 60); do
    if grep -q "Ready" /tmp/taski-frontend.log 2>/dev/null; then
        READY=1
        break
    fi
    sleep 1
done

if [ $READY -eq 1 ]; then
    echo ""
    echo "=========================================="
    echo "  App lista en http://localhost:3000"
    echo "  Abriendo navegador..."
    echo "=========================================="
    open http://localhost:3000
else
    echo "Tomó mas de lo esperado, abriendo de todas formas..."
    open http://localhost:3000
fi

echo ""
echo "Presiona Ctrl+C para detener la app."

# Mantener vivo y matar hijos al salir
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'App detenida.'; exit" INT TERM
wait
