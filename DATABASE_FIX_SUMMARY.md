# Databasproblem - Sammanfattning och Lösning

## Identifierade Problem

### 1. ❌ Connection String Format
**Problem:** PostgreSQL connection string hade fel format när användarnamn innehåller `@`.

**Fel format:**
```
postgresql://sebastian.nilsson@melitta.se:Nilsson1!@172.16.16.73:5432/launch_planner
```

Detta tolkas som:
- Username: `sebastian.nilsson`
- Password: `melitta.se`
- Host: `Nilsson1!@172.16.16.73` ❌ (FEL!)

**Rätt format (URL-encoded):**
```
postgresql://sebastian.nilsson%40melitta.se:Nilsson1%21@172.16.16.73:5432/launch_planner
```

### 2. ❌ Schema Provider Mismatch
**Problem:** `generator client` hade fel provider (`postgresql` istället för `prisma-client-js`).

**Fix:** Uppdaterat till:
```prisma
generator client {
  provider = "prisma-client-js"  // ✅ Alltid detta
}

datasource db {
  provider = "postgresql"  // ✅ Matchar DATABASE_URL
  url      = env("DATABASE_URL")
}
```

### 3. ❌ Authentication Failed
**Problem:** PostgreSQL autentisering misslyckades pga fel connection string format.

## Lösningar Implementerade

### ✅ 1. URL-encoding i buildConnectionString
Nu URL-encodas username och password automatiskt:
```typescript
const encodedUsername = encodeURIComponent(config.username);
const encodedPassword = encodeURIComponent(config.password);
```

### ✅ 2. Förbättrad Connection String Parsing
Hanterar både encoded och non-encoded connection strings.

### ✅ 3. Bättre Felmeddelanden
Specifika felmeddelanden baserat på Prisma error codes:
- P1000: Autentisering misslyckades
- P1001: Kan inte nå servern
- P1003: Databasen finns inte

### ✅ 4. Fix Script
Skapade `scripts/fix-database.sh` för automatisk felsökning.

## Nästa Steg

### För SQLite:
1. Öppna GUI → Inställningar → Databas
2. Välj "SQLite"
3. Sökväg: `file:./prisma/dev.db`
4. Klicka "Spara och konfigurera automatiskt"

### För PostgreSQL:
1. Öppna GUI → Inställningar → Databas
2. Välj "PostgreSQL"
3. Fyll i:
   - **Host:** `172.16.16.73`
   - **Port:** `5432`
   - **Database:** `launch_planner`
   - **Username:** `sebastian.nilsson@melitta.se` (systemet encodar automatiskt)
   - **Password:** `Nilsson1!` (systemet encodar automatiskt)
4. Klicka "Testa konfiguration" först
5. Om testet lyckas, klicka "Spara och konfigurera automatiskt"

### Om Authentication Fortfarande Failar:

1. **Kontrollera credentials:**
   ```bash
   psql -h 172.16.16.73 -U "sebastian.nilsson@melitta.se" -d launch_planner
   ```

2. **Kontrollera att databasen finns:**
   ```sql
   CREATE DATABASE launch_planner;
   ```

3. **Kontrollera behörigheter:**
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE launch_planner TO "sebastian.nilsson@melitta.se";
   ```

4. **Kontrollera nätverksanslutning:**
   ```bash
   telnet 172.16.16.73 5432
   ```

## Testa

Kör testscriptet:
```bash
npm run fix:database
```

Eller manuellt:
```bash
node scripts/test-database.js
```

## Ytterligare Hjälp

Se `DATABASE_TROUBLESHOOTING.md` för mer detaljerad felsökning.

