#!/bin/bash

# Felsökningsscript för Launch Planner
# Detta script diagnostiserar och testar servern

echo "🔍 Launch Planner - Felsökning"
echo "================================"
echo ""

# Färger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Kontrollera katalog
echo "1️⃣ Kontrollerar katalog..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json hittades${NC}"
    echo "   Katalog: $(pwd)"
else
    echo -e "${RED}❌ package.json hittades INTE${NC}"
    echo "   Du är i: $(pwd)"
    echo "   Försök: cd /Users/nille/Documents/Dev/coin/launch-planner"
    exit 1
fi
echo ""

# 2. Kontrollera Node.js
echo "2️⃣ Kontrollerar Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js installerat: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js är INTE installerat${NC}"
    exit 1
fi
echo ""

# 3. Kontrollera npm
echo "3️⃣ Kontrollerar npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm installerat: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm är INTE installerat${NC}"
    exit 1
fi
echo ""

# 4. Kontrollera dependencies
echo "4️⃣ Kontrollerar dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules finns${NC}"
    
    # Kontrollera viktiga paket
    if [ -d "node_modules/express" ]; then
        echo -e "   ${GREEN}✅ express installerat${NC}"
    else
        echo -e "   ${RED}❌ express saknas${NC}"
    fi
    
    if [ -d "node_modules/@prisma/client" ]; then
        echo -e "   ${GREEN}✅ @prisma/client installerat${NC}"
    else
        echo -e "   ${YELLOW}⚠️ @prisma/client saknas - kör: npm run db:generate${NC}"
    fi
    
    if [ -f "node_modules/.bin/concurrently" ]; then
        echo -e "   ${GREEN}✅ concurrently installerat${NC}"
    else
        echo -e "   ${RED}❌ concurrently saknas${NC}"
    fi
else
    echo -e "${RED}❌ node_modules saknas - kör: npm install${NC}"
    exit 1
fi
echo ""

# 5. Kontrollera server-fil
echo "5️⃣ Kontrollerar server-fil..."
if [ -f "server/index.js" ]; then
    echo -e "${GREEN}✅ server/index.js finns${NC}"
else
    echo -e "${RED}❌ server/index.js saknas${NC}"
    exit 1
fi
echo ""

# 6. Kontrollera .env
echo "6️⃣ Kontrollerar .env..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env finns${NC}"
    if grep -q "DATABASE_URL" .env; then
        DB_URL=$(grep "DATABASE_URL" .env | cut -d'=' -f2 | tr -d '"')
        echo "   DATABASE_URL: $DB_URL"
    else
        echo -e "   ${YELLOW}⚠️ DATABASE_URL saknas i .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ .env saknas${NC}"
fi
echo ""

# 7. Kontrollera databas
echo "7️⃣ Kontrollerar databas..."
if [ -f "prisma/dev.db" ]; then
    DB_SIZE=$(ls -lh prisma/dev.db | awk '{print $5}')
    echo -e "${GREEN}✅ Databasfil finns: prisma/dev.db ($DB_SIZE)${NC}"
else
    echo -e "${YELLOW}⚠️ Databasfil saknas: prisma/dev.db${NC}"
    echo "   Kör: npm run db:push"
fi
echo ""

# 8. Kontrollera portar
echo "8️⃣ Kontrollerar portar..."
PORTS_IN_USE=""

if lsof -ti:3000 &> /dev/null; then
    PORTS_IN_USE="$PORTS_IN_USE 3000"
    echo -e "${YELLOW}⚠️ Port 3000 är upptagen${NC}"
    lsof -ti:3000 | xargs ps -p 2>/dev/null | tail -1
else
    echo -e "${GREEN}✅ Port 3000 är ledig${NC}"
fi

if lsof -ti:3001 &> /dev/null; then
    PORTS_IN_USE="$PORTS_IN_USE 3001"
    echo -e "${YELLOW}⚠️ Port 3001 är upptagen${NC}"
    lsof -ti:3001 | xargs ps -p 2>/dev/null | tail -1
else
    echo -e "${GREEN}✅ Port 3001 är ledig${NC}"
fi

if [ ! -z "$PORTS_IN_USE" ]; then
    echo ""
    echo -e "${YELLOW}💡 För att frigöra portar, kör:${NC}"
    echo "   lsof -ti:3000,3001 | xargs kill -9"
fi
echo ""

# 9. Testa att starta backend
echo "9️⃣ Testar backend-server..."
echo "   Startar backend på port 3001..."
timeout 5 node server/index.js > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!
sleep 2

if curl -s http://localhost:3001/api/database/config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend svarar korrekt!${NC}"
    curl -s http://localhost:3001/api/database/config | head -1
    kill $BACKEND_PID 2>/dev/null
else
    echo -e "${RED}❌ Backend svarar INTE${NC}"
    echo "   Logg:"
    cat /tmp/backend-test.log | tail -10
    kill $BACKEND_PID 2>/dev/null
fi
echo ""

# 10. Testa Prisma
echo "🔟 Testar Prisma..."
if npx prisma --version &> /dev/null; then
    PRISMA_VERSION=$(npx prisma --version | head -1)
    echo -e "${GREEN}✅ Prisma fungerar: $PRISMA_VERSION${NC}"
else
    echo -e "${RED}❌ Prisma fungerar INTE${NC}"
fi
echo ""

# Sammanfattning
echo "================================"
echo "📋 Sammanfattning"
echo "================================"
echo ""
echo "För att starta servern, kör:"
echo "  npm run dev:full"
echo ""
echo "Eller separat:"
echo "  Terminal 1: npm run dev"
echo "  Terminal 2: npm run server"
echo ""

