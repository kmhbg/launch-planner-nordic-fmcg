# Database Integration Tests

Detta är integrationstester som testar databasen från frontend-perspektivet.

## Vad testar de?

Testerna simulerar hur frontend använder API:et för att:
- ✅ Skapa produkter
- ✅ Hämta produkter
- ✅ Uppdatera produkter
- ✅ Ta bort produkter
- ✅ Uppdatera aktiviteter
- ✅ Lägga till kommentarer
- ✅ Automatisk skapande av användare

## Hur kör man testerna?

### Alternativ 1: Automatisk (rekommenderat)
Detta startar backend-servern automatiskt om den inte körs:
```bash
npm run test:database:frontend
```

### Alternativ 2: Manuell
1. Starta backend-servern i ett separat terminalfönster:
   ```bash
   npm run server
   ```

2. Kör testerna:
   ```bash
   npm run test:database
   ```

### Alternativ 3: Med Vitest UI
```bash
npm run test:ui
```
Välj sedan `database.integration.test.ts` från listan.

## Vad händer i testerna?

1. **Kontrollerar att backend-servern körs** - Om den inte körs, startas den automatiskt
2. **Skapar testprodukter** - Testar att skapa produkter med olika typer
3. **Hämtar produkter** - Verifierar att produkter kan hämtas
4. **Uppdaterar produkter** - Testar att uppdatera produktdata
5. **Lägger till kommentarer** - Testar att lägga till kommentarer på aktiviteter
6. **Tar bort produkter** - Rensar upp testdata
7. **Testar felhantering** - Verifierar att fel hanteras korrekt

## Viktigt

- Backend-servern måste köras på port 3001
- Databasen måste vara konfigurerad och fungera
- Testerna skapar och tar bort testdata automatiskt
- Om testerna avbryts kan det finnas testdata kvar i databasen

## Felsökning

### Backend-servern körs inte
```bash
# Starta backend-servern manuellt
npm run server
```

### Port 3001 är upptagen
```bash
# Hitta och stoppa processen
lsof -ti:3001 | xargs kill -9
```

### Databasfel
```bash
# Verifiera databasanslutning
node scripts/test-database.js
```

## Exempel på testresultat

```
✓ Database API Integration Tests (Frontend Perspective) (8)
  ✓ GET /api/products
    ✓ ska kunna hämta alla produkter
    ✓ ska returnera en array även om det inte finns några produkter
  ✓ POST /api/products
    ✓ ska kunna skapa en produkt
    ✓ ska automatiskt skapa användare om den inte finns
    ✓ ska kunna skapa en delisting-produkt
  ✓ GET /api/products/:id
    ✓ ska kunna hämta en specifik produkt
    ✓ ska returnera 404 för produkt som inte finns
  ✓ PUT /api/products/:id
    ✓ ska kunna uppdatera en produkt
  ✓ PUT /api/activities/:id
    ✓ ska kunna uppdatera en aktivitet
  ✓ POST /api/activities/:id/comments
    ✓ ska kunna lägga till en kommentar
    ✓ ska automatiskt skapa användare för kommentar om den inte finns
  ✓ DELETE /api/products/:id
    ✓ ska kunna ta bort en produkt
  ✓ Felhantering
    ✓ ska hantera ogiltig produktdata
    ✓ ska hantera ogiltigt produkt-ID vid uppdatering

Test Files  1 passed (1)
     Tests  15 passed (15)
```

