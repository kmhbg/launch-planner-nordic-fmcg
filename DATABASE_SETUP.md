# Databashantering - Setup Guide

Detta projekt använder **Prisma ORM** för databashantering, vilket stödjer flera databastyper.

## Stödda databaser

- ✅ **SQLite** (standard, enklast att komma igång)
- ✅ **PostgreSQL**
- ✅ **MySQL**
- ✅ **SQL Server / Azure SQL**

## Snabbstart (SQLite)

1. **Installera dependencies:**
   ```bash
   npm install
   ```

2. **Konfigurera databas:**
   ```bash
   cp .env.example .env
   ```
   `.env` innehåller redan `DATABASE_URL="file:./dev.db"` för SQLite.

3. **Generera Prisma Client:**
   ```bash
   npm run db:generate
   ```

4. **Kör migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Klar!** Databasen är nu redo att användas.

## Byt till PostgreSQL

1. **Uppdatera `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Uppdatera `.env`:**
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/launch_planner?schema=public"
   ```

3. **Kör migrations:**
   ```bash
   npm run db:migrate
   ```

## Byt till MySQL

1. **Uppdatera `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Uppdatera `.env`:**
   ```
   DATABASE_URL="mysql://user:password@localhost:3306/launch_planner"
   ```

3. **Kör migrations:**
   ```bash
   npm run db:migrate
   ```

## Byt till Azure SQL Server

1. **Uppdatera `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "sqlserver"
     url      = env("DATABASE_URL")
   }
   ```

2. **Uppdatera `.env`:**
   ```
   DATABASE_URL="sqlserver://server.database.windows.net:1433;database=launch_planner;user=user@server;password=password;encrypt=true"
   ```

3. **Kör migrations:**
   ```bash
   npm run db:migrate
   ```

## NPM Scripts

- `npm run db:generate` - Generera Prisma Client
- `npm run db:migrate` - Skapa och kör migrations
- `npm run db:studio` - Öppna Prisma Studio (GUI för databas)
- `npm run db:push` - Push schema till databas (utveckling, skapar inte migrations)

## Prisma Studio

Öppna en grafisk gränssnitt för att se och redigera data:

```bash
npm run db:studio
```

Öppnar http://localhost:5555 i din webbläsare.

## Databasstruktur

Se `prisma/schema.prisma` för fullständig databasstruktur. Huvudtabeller:

- **Role** - Roller i systemet
- **User** - Användare
- **UserRole** - Många-till-många relation mellan User och Role
- **Template** - Mallar för produktlanseringar
- **ActivityTemplate** - Aktivitetsdata för mallar
- **Product** - Produkter
- **RetailerLaunch** - Kedjor och lanseringsveckor per produkt
- **Activity** - Aktiviteter per produkt
- **Comment** - Kommentarer på aktiviteter

## Migrations

Migrations skapas automatiskt när du ändrar `schema.prisma` och kör `npm run db:migrate`.

För produktion, kör:
```bash
npx prisma migrate deploy
```

## Felsökning

### "Prisma Client has not been generated"
Kör: `npm run db:generate`

### "Migration failed"
Kontrollera att databasen är tillgänglig och att `DATABASE_URL` är korrekt.

### "Table already exists"
Om du har ändrat schema manuellt, kör: `npm run db:push` istället för `db:migrate`

