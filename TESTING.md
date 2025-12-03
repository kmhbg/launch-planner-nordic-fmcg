# Test Cases - Launch Planner

## Översikt

Detta dokument beskriver test cases och teststrategi för Launch Planner-applikationen.

## Testramverk

- **Vitest**: Unit och integration tests
- **React Testing Library**: Komponenttester
- **Playwright/Cypress**: E2E-tester (rekommenderat)

## Test Coverage

### 1. Unit Tests

#### Validation (`src/utils/__tests__/validation.test.ts`)
- ✅ EAN-13 GTIN-validering
- ✅ Kontrollsiffra-verifiering
- ✅ Formatering av GTIN
- ✅ Hantering av ogiltiga format

#### Timeline (`src/utils/__tests__/timeline.test.ts`)
- ✅ Beräkning av lanseringsdatum
- ✅ Deadline-beräkningar
- ✅ Vecka-formatering
- ✅ Aktivitet-generering

#### Product Status (`src/utils/__tests__/product-status.test.ts`)
- ✅ Automatisk status-beräkning
- ✅ Status baserat på aktiviteter
- ✅ Edge cases (inga aktiviteter, alla klara, etc.)

### 2. Integration Tests

#### Store (`src/store/__tests__/store.test.ts`)
- ✅ Produkthantering (add, update, delete)
- ✅ Aktivitet-hantering
- ✅ Användarhantering
- ✅ Automatisk vecka-beräkning från retailers

### 3. Komponenttester (TODO)

#### Dashboard
- [ ] Visar alla produkter
- [ ] Filtrering fungerar
- [ ] Statistik är korrekt
- [ ] Navigation till produktvy

#### ProductForm
- [ ] Validering av GTIN
- [ ] Retailer-hantering
- [ ] Formulär-submission
- [ ] Felhantering

#### ProductView
- [ ] Visar produktinformation
- [ ] Aktivitet-lista
- [ ] Status-uppdatering
- [ ] Kommentar-funktionalitet

#### TimelineView
- [ ] Filtrering på vecka
- [ ] Filtrering på datum
- [ ] Filtrering på ansvarig
- [ ] Sortering

### 4. E2E Test Scenarios

#### Scenario 1: Skapa ny produkt
1. Gå till Dashboard
2. Klicka på "Ny produkt"
3. Fyll i GTIN, namn, retailers
4. Välj lanseringsveckor
5. Spara
6. Verifiera att produkt visas på dashboard
7. Verifiera att aktiviteter genererats

#### Scenario 2: Uppdatera aktivitetsstatus
1. Öppna en produkt
2. Klicka på en aktivitet
3. Ändra status till "Pågående"
4. Verifiera att status uppdateras
5. Verifiera att produktstatus uppdateras automatiskt

#### Scenario 3: Filtrera tidslinje
1. Gå till Tidslinje
2. Välj vecka i filter
3. Verifiera att endast aktiviteter för den veckan visas
4. Lägg till filter på ansvarig
5. Verifiera att båda filtren fungerar tillsammans

#### Scenario 4: Databaskonfiguration
1. Gå till Inställningar → Databas
2. Välj SQLite
3. Testa konfiguration
4. Spara konfiguration
5. Verifiera att databas skapas

## Kör tester

### Installera test dependencies
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### Kör alla tester
```bash
npm test
```

### Kör tester i watch mode
```bash
npm test -- --watch
```

### Kör tester med coverage
```bash
npm test -- --coverage
```

## Test Coverage Goals

- **Utils**: 90%+ coverage
- **Store**: 80%+ coverage
- **Components**: 70%+ coverage
- **E2E**: Kritiska user flows

## CI/CD Integration

Tester ska köras automatiskt:
- Vid varje commit (pre-commit hook)
- Vid pull requests
- Vid deployment

## Test Data

Använd mock data för tester:
- Testprodukter med kända GTINs
- Testanvändare med olika roller
- Testaktiviteter med olika statusar

