# Databasproblem - Lösning

## Identifierat Problem

### Huvudproblem: Databasfil på fel plats
**Problem:** SQLite-databasfilen låg på fel plats: `prisma/prisma/dev.db` istället för `prisma/dev.db`

Detta orsakade att:
- Prisma kunde inte hitta databasfilen när den kördes från projektroten
- Databasanslutningar misslyckades
- Applikationen kunde inte spara eller ladda data

## Lösning Implementerad

### 1. ✅ Flyttat databasfil till rätt plats
```bash
mv prisma/prisma/dev.db prisma/dev.db
rm -rf prisma/prisma  # Tog bort den felaktiga katalogen
```

### 2. ✅ Verifierat databasanslutning
```bash
npx prisma db push --skip-generate
# Resultat: "Your database is now in sync with your Prisma schema"
```

### 3. ✅ Testat Prisma Client-anslutning
```bash
node -e "const { PrismaClient } = require('@prisma/client'); ..."
# Resultat: ✅ Databasanslutning fungerar!
```

## Nuvarande Status

- ✅ Databasfil finns på rätt plats: `prisma/dev.db`
- ✅ Prisma schema är synkat med databasen
- ✅ Prisma Client är genererad och fungerar
- ✅ Databasanslutning verifierad

## Konfiguration

### .env
```
DATABASE_URL="file:./prisma/dev.db"
```

### schema.prisma
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

## Nästa Steg

1. Starta backend-servern:
   ```bash
   npm run server
   # eller
   npm run dev:full
   ```

2. Starta frontend:
   ```bash
   npm run dev
   ```

3. Testa att skapa en produkt i applikationen och verifiera att den sparas i databasen

4. (Valfritt) Öppna Prisma Studio för att inspektera databasen:
   ```bash
   npx prisma studio
   ```

## Ytterligare Kontroller

### Kontrollera att databasfilen finns
```bash
ls -la prisma/dev.db
```

### Testa databasanslutning manuellt
```bash
node scripts/test-database.js
```

### Verifiera Prisma Client
```bash
npx prisma generate
```

## Noteringar

- `database.service.ts` används INTE i frontend-koden (det är bra - Prisma Client fungerar bara på servern)
- Frontend använder API-anrop till backend (`/api/products`, etc.) vilket är korrekt
- Backend använder `server/database-api.js` som använder Prisma Client korrekt

## Ytterligare Problem: Backend-servern Körs Inte

### Problem: ECONNREFUSED på API-anrop
**Symptom:** Proxy-fel när frontend försöker nå `/api/database/config` eller `/api/database/save`

**Orsak:** Backend-servern (port 3001) körs inte

**Lösning:**
1. Starta backend-servern i ett separat terminalfönster:
   ```bash
   npm run server
   ```
   
2. Eller starta både frontend och backend samtidigt:
   ```bash
   npm run dev:full
   ```

3. Verifiera att servern körs:
   ```bash
   curl http://localhost:3001/api/database/config
   # eller
   lsof -ti:3001
   ```

**Viktigt:** Backend-servern måste köras för att API-anropen ska fungera. Frontend (Vite) proxar alla `/api/*`-anrop till `http://localhost:3001`.

## Om Problemet Återkommer

### Databasproblem
Om databasfilen försvinner eller flyttas igen:

1. Kontrollera `.env` filen - `DATABASE_URL` ska vara `file:./prisma/dev.db`
2. Kontrollera att `prisma/` katalogen finns
3. Kör `npx prisma db push` för att skapa/återskapa databasen
4. Verifiera att filen skapas på rätt plats: `ls -la prisma/dev.db`

### Backend-serverproblem

#### Problem: EADDRINUSE - Port redan upptagen
**Symptom:** `Error: listen EADDRINUSE: address already in use :::3001`

**Orsak:** En annan process kör redan på port 3001 (t.ex. från tidigare start)

**Lösning:**
```bash
# Stoppa processen på port 3001
lsof -ti:3001 | xargs kill -9

# Eller hitta och stoppa manuellt
lsof -i:3001  # Visa processen
kill -9 <PID>  # Stoppa med process-ID
```

#### Problem: API-anrop misslyckas
Om API-anrop misslyckas:

1. Kontrollera att backend-servern körs: `lsof -ti:3001`
2. Kontrollera att port 3001 inte är upptagen av annan process
3. Starta servern: `npm run server` eller `npm run dev:full`
4. Kontrollera loggar för felmeddelanden
5. Verifiera att databasfilen finns: `ls -la prisma/dev.db`

