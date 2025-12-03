#!/bin/bash

# Script för att byta till SQLite för utveckling

echo "🔄 Bytter till SQLite för utveckling..."
echo ""

# 1. Uppdatera .env
echo "1️⃣ Uppdaterar .env..."
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
EOF
echo "✅ .env uppdaterad till SQLite"
echo ""

# 2. Uppdatera schema.prisma
echo "2️⃣ Uppdaterar schema.prisma..."
sed -i.bak 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
echo "✅ Schema uppdaterat till SQLite"
echo ""

# 3. Generera Prisma Client
echo "3️⃣ Genererar Prisma Client..."
if npx prisma generate > /tmp/prisma-gen.log 2>&1; then
    echo "✅ Prisma Client genererad"
else
    echo "❌ Prisma Client generering misslyckades"
    cat /tmp/prisma-gen.log | tail -5
    exit 1
fi
echo ""

# 4. Skapa databas och push schema
echo "4️⃣ Skapar databas och pushar schema..."
if npx prisma db push --accept-data-loss > /tmp/db-push.log 2>&1; then
    echo "✅ Databas skapad och schema pushat!"
    echo ""
    echo "📊 Databasfil: prisma/dev.db"
    ls -lh prisma/dev.db 2>/dev/null || echo "   (kommer skapas vid första användning)"
else
    echo "⚠️ Schema push misslyckades"
    cat /tmp/db-push.log | tail -5
fi
echo ""

echo "✅ Klart! SQLite är nu konfigurerad."
echo ""
echo "📝 Nästa steg:"
echo "   1. Starta om backend-servern (om den körs)"
echo "   2. Testa i GUI: http://localhost:3000"
echo ""
echo "💡 För att byta tillbaka till PostgreSQL:"
echo "   - Använd GUI:et (Inställningar → Databas)"
echo "   - Eller kör: git checkout prisma/schema.prisma .env"

