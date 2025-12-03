# Frontend Databasproblem - Lösning

## Identifierat Problem

### Huvudproblem: Foreign Key Constraint-fel vid skapande av produkter
**Problem:** När frontend försöker skapa en produkt, misslyckas det med ett foreign key constraint-fel.

**Orsak:** 
- `Product.createdById` måste referera till en `User` som finns i databasen
- När produkter skapas med `createdBy: 'unknown'` eller ett användar-ID som inte finns, misslyckas det
- Samma problem finns när kommentarer skapas - `Comment.userId` måste referera till en befintlig `User`

## Lösning Implementerad

### 1. ✅ Automatisk skapande av användare i `createProduct`
Nu skapas användaren automatiskt om den inte finns när en produkt skapas:
```javascript
// Säkerställ att användaren finns i databasen
const userId = productData.createdBy || 'unknown';
let user = await prisma.user.findUnique({ where: { id: userId } });

if (!user) {
  // Skapa default-användare om den inte finns
  user = await prisma.user.create({
    data: {
      id: userId,
      name: userId === 'unknown' ? 'Okänd användare' : userId,
      email: userId === 'unknown' ? 'unknown@example.com' : `${userId}@example.com`,
      role: 'user',
    },
  });
}
```

### 2. ✅ Automatisk skapande av användare i `addComment`
Samma logik implementerad för kommentarer:
```javascript
// Säkerställ att användaren finns i databasen
const userId = comment.userId;
let user = await prisma.user.findUnique({ where: { id: userId } });

if (!user) {
  // Skapa användare om den inte finns
  user = await prisma.user.create({
    data: {
      id: userId,
      name: comment.userName || userId,
      email: `${userId}@example.com`,
      role: 'user',
    },
  });
}
```

### 3. ✅ Default-användare skapas vid serverns start
En default-användare (`unknown`) skapas automatiskt när servern startar:
```javascript
// Säkerställ att default-användare finns
const defaultUser = await prisma.user.findUnique({ where: { id: 'unknown' } });
if (!defaultUser) {
  await prisma.user.create({
    data: {
      id: 'unknown',
      name: 'Okänd användare',
      email: 'unknown@example.com',
      role: 'user',
    },
  });
}
```

## Nuvarande Status

- ✅ `createProduct` skapar användare automatiskt om den inte finns
- ✅ `addComment` skapar användare automatiskt om den inte finns
- ✅ Default-användare skapas vid serverns start
- ✅ Foreign key constraints kommer nu att fungera korrekt

## Testa

1. Starta servern: `npm run dev:full`
2. Skapa en produkt i frontend
3. Produkten bör nu sparas korrekt i databasen utan foreign key-fel

## Ytterligare Förbättringar (Valfritt)

Om du vill ha bättre användarhantering i framtiden:

1. **Användarautentisering:** Implementera riktig autentisering (t.ex. Microsoft Teams SSO)
2. **Användarvalidering:** Validera att användar-ID:n är giltiga innan produkter skapas
3. **Användargränssnitt:** Lägg till funktionalitet för att hantera användare i Settings

## Relaterade Filer

- `server/database-api.js` - `createProduct()` och `addComment()` funktioner
- `server/index.js` - `ensureDatabase()` funktion
- `prisma/schema.prisma` - Databasschema med foreign key constraints

