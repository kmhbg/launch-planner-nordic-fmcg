#!/bin/bash

# Test-script för att testa databasen från frontend-perspektiv
# Detta script startar backend-servern och kör integrationstester

set -e

echo "🧪 Testar databasen från frontend-perspektiv"
echo ""

# Kontrollera om backend-servern körs
if ! curl -s http://localhost:3001/api/products > /dev/null 2>&1; then
    echo "⚠️  Backend-servern körs inte på port 3001"
    echo "💡 Startar backend-servern i bakgrunden..."
    
    # Starta backend-servern i bakgrunden
    npm run server > /tmp/backend-test.log 2>&1 &
    BACKEND_PID=$!
    
    echo "⏳ Väntar på att backend-servern ska starta..."
    sleep 3
    
    # Vänta tills servern svarar
    for i in {1..30}; do
        if curl -s http://localhost:3001/api/products > /dev/null 2>&1; then
            echo "✅ Backend-servern är igång!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Backend-servern startade inte inom 30 sekunder"
            kill $BACKEND_PID 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
else
    echo "✅ Backend-servern körs redan"
    BACKEND_PID=""
fi

echo ""
echo "🚀 Kör integrationstester..."
echo ""

# Kör tester
npm run test -- src/api/__tests__/database.integration.test.ts

TEST_EXIT_CODE=$?

# Stoppa backend-servern om vi startade den
if [ ! -z "$BACKEND_PID" ]; then
    echo ""
    echo "🛑 Stoppar backend-servern..."
    kill $BACKEND_PID 2>/dev/null || true
    sleep 1
fi

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Alla tester passerade!"
    exit 0
else
    echo ""
    echo "❌ Några tester misslyckades"
    exit 1
fi

