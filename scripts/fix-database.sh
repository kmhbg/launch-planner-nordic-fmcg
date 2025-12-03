#!/bin/bash

# Script för att fixa databasproblem

echo "🔧 Launch Planner - Databas Fix Script"
echo "======================================"
echo ""

# Färger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Kontrollera .env
echo "1️⃣ Kontrollerar .env..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env finns${NC}"
    DB_URL=$(grep "DATABASE_URL" .env | cut -d'=' -f2 | tr -d '"')
    echo "   DATABASE_URL: ${DB_URL:0:50}..."
    
    # Detektera provider
    if [[ $DB_URL == file:* ]]; then
        PROVIDER="sqlite"
    elif [[ $DB_URL == postgresql:* ]]; then
        PROVIDER="postgresql"
    elif [[ $DB_URL == mysql:* ]]; then
        PROVIDER="mysql"
    elif [[ $DB_URL == sqlserver:* ]]; then
        PROVIDER="sqlserver"
    else
        PROVIDER="unknown"
    fi
    echo "   Provider: $PROVIDER"
else
    echo -e "${RED}❌ .env saknas${NC}"
    echo "   Skapar standard .env..."
    echo 'DATABASE_URL="file:./prisma/dev.db"' > .env
    PROVIDER="sqlite"
fi
echo ""

# 2. Kontrollera schema.prisma
echo "2️⃣ Kontrollerar schema.prisma..."
if [ -f "prisma/schema.prisma" ]; then
    SCHEMA_PROVIDER=$(grep -A 2 "datasource db" prisma/schema.prisma | grep "provider" | sed 's/.*provider = "\([^"]*\)".*/\1/')
    echo "   Schema provider: $SCHEMA_PROVIDER"
    
    if [ "$SCHEMA_PROVIDER" != "$PROVIDER" ]; then
        echo -e "${YELLOW}⚠️ Provider mismatch!${NC}"
        echo "   Uppdaterar schema.prisma..."
        sed -i.bak "s/datasource db {[^}]*provider = \"[^\"]*\"/datasource db {\n  provider = \"$PROVIDER\"/" prisma/schema.prisma
        echo -e "${GREEN}✅ Schema uppdaterat${NC}"
    else
        echo -e "${GREEN}✅ Provider matchar${NC}"
    fi
else
    echo -e "${RED}❌ schema.prisma saknas${NC}"
    exit 1
fi
echo ""

# 3. Generera Prisma Client
echo "3️⃣ Genererar Prisma Client..."
if npx prisma generate > /tmp/prisma-gen.log 2>&1; then
    echo -e "${GREEN}✅ Prisma Client genererad${NC}"
else
    echo -e "${RED}❌ Prisma Client generering misslyckades${NC}"
    cat /tmp/prisma-gen.log | tail -10
    exit 1
fi
echo ""

# 4. Testa anslutning
echo "4️⃣ Testar databasanslutning..."
if node scripts/test-database.js > /tmp/db-test.log 2>&1; then
    echo -e "${GREEN}✅ Databasanslutning fungerar!${NC}"
else
    echo -e "${RED}❌ Databasanslutning misslyckades${NC}"
    cat /tmp/db-test.log | tail -15
    echo ""
    echo -e "${YELLOW}💡 Tips:${NC}"
    echo "   - Kontrollera att databasservern körs"
    echo "   - Kontrollera användarnamn och lösenord"
    echo "   - Kontrollera nätverksanslutning"
    exit 1
fi
echo ""

# 5. Push schema
echo "5️⃣ Pushar schema till databas..."
if [ "$PROVIDER" == "sqlite" ]; then
    if npx prisma db push --accept-data-loss > /tmp/db-push.log 2>&1; then
        echo -e "${GREEN}✅ Schema pushat!${NC}"
    else
        echo -e "${YELLOW}⚠️ Schema push misslyckades (kanske redan synkad)${NC}"
        cat /tmp/db-push.log | tail -5
    fi
else
    echo "   För PostgreSQL/MySQL, kör manuellt:"
    echo "   npm run db:migrate"
    echo "   eller"
    echo "   npx prisma db push"
fi
echo ""

echo -e "${GREEN}✅ Databas fix klar!${NC}"
echo ""
echo "Testa nu i GUI:et eller kör:"
echo "  node scripts/test-database.js"

