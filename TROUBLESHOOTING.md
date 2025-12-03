# Felsökningsguide - Launch Planner

## Snabbdiagnostik

Kör felsökningsscriptet:
```bash
npm run debug
```

Detta kontrollerar:
- ✅ Katalog och filer
- ✅ Node.js och npm
- ✅ Dependencies
- ✅ Server-filer
- ✅ Databas
- ✅ Portar
- ✅ Backend-funktionalitet

## Vanliga problem och lösningar

### 1. "package.json hittades inte"

**Problem:** Du är i fel katalog.

**Lösning:**
```bash
cd /Users/nille/Documents/Dev/coin/launch-planner
```

### 2. "Port 3000/3001 är upptagen"

**Problem:** En process använder redan porten.

**Lösning:**
```bash
# Stoppa alla processer på portarna
lsof -ti:3000,3001 | xargs kill -9

# Starta igen
npm run dev:full
```

### 3. "Failed to fetch" i GUI

**Problem:** Backend körs inte eller är inte tillgänglig.

**Lösning:**
```bash
# 1. Kontrollera att backend körs
curl http://localhost:3001/api/database/config

# 2. Om det inte svarar, starta backend
npm run server

# 3. Kontrollera i en annan terminal
lsof -ti:3001
```

### 4. "node_modules saknas"

**Problem:** Dependencies är inte installerade.

**Lösning:**
```bash
npm install
```

### 5. "@prisma/client saknas"

**Problem:** Prisma Client är inte genererad.

**Lösning:**
```bash
npm run db:generate
```

### 6. "Databasfil saknas"

**Problem:** Databasen är inte skapad.

**Lösning:**
```bash
npm run db:push
```

### 7. Backend startar men svarar inte

**Testa backend direkt:**
```bash
npm run test:server
```

Detta startar en enkel testserver som verifierar att allt fungerar.

### 8. "concurrently saknas"

**Problem:** concurrently är inte installerat.

**Lösning:**
```bash
npm install
```

## Steg-för-steg start

1. **Navigera till rätt katalog:**
   ```bash
   cd /Users/nille/Documents/Dev/coin/launch-planner
   ```

2. **Kontrollera att allt är installerat:**
   ```bash
   npm run debug
   ```

3. **Stoppa eventuella processer:**
   ```bash
   lsof -ti:3000,3001 | xargs kill -9
   ```

4. **Starta servern:**
   ```bash
   npm run dev:full
   ```

5. **Verifiera att det fungerar:**
   - Öppna http://localhost:3000 i webbläsaren
   - Kontrollera backend: `curl http://localhost:3001/api/database/config`

## Testa komponenter separat

### Testa backend:
```bash
npm run server
# I en annan terminal:
curl http://localhost:3001/api/database/config
```

### Testa frontend:
```bash
npm run dev
# Öppna http://localhost:3000
```

### Testa Prisma:
```bash
npm run db:generate
npm run db:push
npm run db:studio  # Öppnar GUI för databas
```

## Loggar och debugging

### Backend loggar
Backend loggar skrivs till konsolen. Om du vill spara dem:
```bash
npm run server > backend.log 2>&1
```

### Frontend loggar
Öppna webbläsarens DevTools (F12) och kolla Console-fliken.

### Prisma loggar
Prisma loggar visas när du kör kommandon. För mer detaljer:
```bash
DEBUG="*" npm run db:push
```

## Kontakta support

Om inget av ovanstående fungerar, samla in denna information:

```bash
# Kör felsökningsscriptet
npm run debug > debug-output.txt

# Lägg till systeminfo
echo "=== System ===" >> debug-output.txt
node --version >> debug-output.txt
npm --version >> debug-output.txt
uname -a >> debug-output.txt

# Visa output
cat debug-output.txt
```

