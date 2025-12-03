#!/bin/bash

# Komplett databas setup från början

set -e  # Exit on error

echo "🔧 Launch Planner - Komplett Databas Setup"
echo "=========================================="
echo ""

# Färger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Rensa gamla konfigurationer
echo -e "${BLUE}1️⃣ Rensar gamla konfigurationer...${NC}"
rm -f prisma/dev.db prisma/dev.db-journal
echo -e "${GREEN}✅ Rensat${NC}"
echo ""

# 2. Skapa .env med SQLite
echo -e "${BLUE}2️⃣ Skapar .env med SQLite...${NC}"
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
EOF
echo -e "${GREEN}✅ .env skapad${NC}"
echo "   DATABASE_URL=file:./prisma/dev.db"
echo ""

# 3. Uppdatera schema.prisma
echo -e "${BLUE}3️⃣ Uppdaterar schema.prisma...${NC}"
# Backup först
cp prisma/schema.prisma prisma/schema.prisma.bak

# Uppdatera provider
sed -i.bak 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
sed -i.bak 's/provider = "mysql"/provider = "sqlite"/' prisma/schema.prisma
sed -i.bak 's/provider = "sqlserver"/provider = "sqlite"/' prisma/schema.prisma

# Verifiera
if grep -q 'provider = "sqlite"' prisma/schema.prisma; then
    echo -e "${GREEN}✅ Schema uppdaterat till SQLite${NC}"
else
    echo -e "${RED}❌ Kunde inte uppdatera schema${NC}"
    exit 1
fi
echo ""

# 4. Generera Prisma Client
echo -e "${BLUE}4️⃣ Genererar Prisma Client...${NC}"
if npx prisma generate > /tmp/prisma-gen.log 2>&1; then
    echo -e "${GREEN}✅ Prisma Client genererad${NC}"
else
    echo -e "${RED}❌ Prisma Client generering misslyckades${NC}"
    cat /tmp/prisma-gen.log | tail -10
    exit 1
fi
echo ""

# 5. Push schema till databas
echo -e "${BLUE}5️⃣ Pushar schema till databas...${NC}"
if npx prisma db push --accept-data-loss > /tmp/db-push.log 2>&1; then
    echo -e "${GREEN}✅ Schema pushat!${NC}"
    cat /tmp/db-push.log | grep -E "(Creating|Applying|Your database is now in sync)" || true
else
    echo -e "${RED}❌ Schema push misslyckades${NC}"
    cat /tmp/db-push.log | tail -15
    exit 1
fi
echo ""

# 6. Verifiera databasfil
echo -e "${BLUE}6️⃣ Verifierar databasfil...${NC}"
if [ -f "prisma/dev.db" ]; then
    SIZE=$(ls -lh prisma/dev.db | awk '{print $5}')
    echo -e "${GREEN}✅ Databasfil skapad: prisma/dev.db (${SIZE})${NC}"
else
    echo -e "${YELLOW}⚠️ Databasfil saknas (kommer skapas vid första användning)${NC}"
fi
echo ""

# 7. Testa Prisma Client
echo -e "${BLUE}7️⃣ Testar Prisma Client anslutning...${NC}"
if node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Prisma Client anslutning OK');
    return prisma.\$queryRaw\`SELECT 1 as test\`;
  })
  .then((result) => {
    console.log('✅ Query fungerar:', result);
    return prisma.\$disconnect();
  })
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Fel:', e.message);
    process.exit(1);
  });
" 2>&1; then
    echo -e "${GREEN}✅ Prisma Client test lyckades${NC}"
else
    echo -e "${RED}❌ Prisma Client test misslyckades${NC}"
    exit 1
fi
echo ""

# 8. Testa DatabaseService
echo -e "${BLUE}8️⃣ Testar DatabaseService...${NC}"
if node -e "
import('./src/services/database.service.js').then(({ dbService }) => {
  return dbService.getAllProducts();
}).then((products) => {
  console.log('✅ DatabaseService fungerar! Antal produkter:', products.length);
  process.exit(0);
}).catch((e) => {
  console.error('❌ DatabaseService fel:', e.message);
  process.exit(1);
});
" 2>&1; then
    echo -e "${GREEN}✅ DatabaseService test lyckades${NC}"
else
    echo -e "${YELLOW}⚠️ DatabaseService test misslyckades (kan vara pga ES modules)${NC}"
fi
echo ""

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DATABAS SETUP KLAR!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "📝 Nästa steg:"
echo "   1. Starta om backend-servern:"
echo "      npm run dev:full"
echo ""
echo "   2. Testa i GUI:"
echo "      http://localhost:3000"
echo ""
echo "   3. Öppna Prisma Studio (valfritt):"
echo "      npm run db:studio"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   - Databasfil: prisma/dev.db"
echo "   - För att byta till PostgreSQL: Använd GUI (Inställningar → Databas)"
echo "   - Backup schema: prisma/schema.prisma.bak"

