# Launch Planner - Nordic FMCG

En modern, skandinavisk webbapp för att planera och följa upp produktlanseringar i dagligvaruhandeln i Norden. Appen är designad för att integreras i Microsoft Teams och hjälper företag att hantera alla uppgifter som måste slutföras innan en produkt lanseras.

## 🎯 Funktioner

### Huvudfunktioner
- **Automatisk tidslinje-generering**: Systemet räknar automatiskt baklänges från lanseringsveckan och genererar alla nödvändiga aktiviteter
- **ECR 16-veckorsprocess**: Bygger på den beprövade ECR-processen med flexibilitet att anpassa
- **Dashboard**: Översikt över alla produktlanseringar med status och framsteg
- **Produktvy**: Detaljerad vy per produkt med alla aktiviteter och deadlines
- **Tidslinje**: Gantt-liknande vy över alla aktiviteter över tid
- **Flexibla mallar**: Administratörer kan skapa och anpassa aktivitetsmallar
- **Rollbaserad åtkomst**: Admin och användarroller med olika behörigheter

### Export-funktioner
- **PDF-export**: Generera professionella lanseringsplaner i PDF-format
- **Excel-export**: Exportera alla produkter och aktiviteter till Excel
- **Kalender-integration**: Exportera aktiviteter till Outlook (.ics)

### Microsoft Teams-integration
- Fungerar som Teams Tab-app
- Integrerar med Microsoft Graph för användarhantering
- Stöd för Teams-kontext och notifikationer

## 🚀 Kom igång

### Förutsättningar
- Node.js 18+ och npm/yarn
- Microsoft Teams Developer Account (för Teams-integration)

### Installation

1. **Klona eller navigera till projektet**
```bash
cd launch-planner
```

2. **Installera beroenden**
```bash
npm install
```

3. **Starta både frontend och backend**
```bash
npm run dev:full
```

Detta startar:
- Frontend på `http://localhost:3000`
- Backend API på `http://localhost:3001`

**Alternativt, starta separat:**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

### Bygga för produktion

```bash
npm run build
```

Byggfiler kommer att skapas i `dist/`-mappen.

## 📁 Projektstruktur

```
launch-planner/
├── src/
│   ├── components/          # React-komponenter
│   │   ├── Dashboard.tsx
│   │   ├── ProductView.tsx
│   │   ├── TimelineView.tsx
│   │   ├── TaskList.tsx
│   │   ├── Settings.tsx
│   │   └── Layout.tsx
│   ├── store/              # State management (Zustand)
│   │   └── store.ts
│   ├── types/              # TypeScript-typer
│   │   └── index.ts
│   ├── utils/              # Hjälpfunktioner
│   │   ├── timeline.ts     # Tidslinje-logik
│   │   └── export.ts       # Export-funktioner
│   ├── styles/             # Globala stilar
│   │   └── global.css
│   ├── App.tsx             # Huvudkomponent
│   └── main.tsx            # Entry point
├── manifest.json           # Microsoft Teams manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎨 Design

Appen följer en skandinavisk, modern och minimalistisk design med:
- Ljusa ytor och luftiga listor
- Neutrala färger med accentfärg (#0066cc)
- Inspiration från Notion, Asana Timeline och Linear
- Responsiv design för mobil och desktop
- Microsoft Teams designlinje

## 📊 Datamodell

### Produkt (Product)
- GTIN, namn, lanseringsvecka/år
- Status (utkast, aktiv, klart, inställd)
- Kategori och kedja (ICA, Axfood, etc.)
- Lista över aktiviteter

### Aktivitet (Activity)
- Namn, beskrivning, kategori
- Deadline (datum och vecka)
- Status (ej påbörjad, pågående, klart)
- Ansvarig person
- Kommentarer

### Mall (Template)
- Namn och beskrivning
- Lista över aktivitetsmallar
- Standard eller kedjespecifik

## 🔧 Konfiguration

### Microsoft Teams

1. **Uppdatera manifest.json**
   - Ersätt `YOUR_APP_ID_HERE` med ditt Teams App ID
   - Uppdatera `your-domain.com` med din domän
   - Lägg till ikoner (`icon-outline.png` och `icon-color.png`)

2. **Deploy appen**
   - Bygg appen: `npm run build`
   - Deploy `dist/` till en webbserver med HTTPS
   - Uppdatera `contentUrl` i manifest.json

3. **Ladda upp till Teams**
   - Gå till [Teams Developer Portal](https://dev.teams.microsoft.com)
   - Skapa en ny app eller uppdatera befintlig
   - Ladda upp manifest.json och ikoner

### Standardprocess (ECR 16-veckorsprocess)

Standardaktiviteter:
- **-15 veckor**: Avisering produkt + artikeldata påbörjas
- **-13 veckor**: Första intern godkännande + preliminär produktinfo
- **-12 veckor**: Bilder, GS1-validering, komplett artikelinformation
- **-11 veckor**: Förpackningsgodkännande
- **-10 veckor**: Pris & villkor, Kundpresentation / offert
- **-8 veckor**: Kundbeslut, listing
- **-6 veckor**: Prognos, logistikplan
- **-4 veckor**: Produktionsstart, lagersaldo
- **-2 veckor**: Leverans till centrallager
- **0**: Lansering / Hyllstart

Dessa kan anpassas i inställningar av administratörer.

## 🛠️ Utveckling

### Teknologier
- **React 18** - UI-bibliotek
- **TypeScript** - Typ-säkerhet
- **Vite** - Build tool och dev server
- **Zustand** - State management
- **Prisma** - Database ORM (stödjer SQLite, PostgreSQL, MySQL, SQL Server)
- **date-fns** - Datumhantering
- **jsPDF** - PDF-generering
- **xlsx** - Excel-export
- **@microsoft/teams-js** - Teams SDK

### Utvecklingskommandon

```bash
# Starta dev server
npm run dev

# Bygg för produktion
npm run build

# Preview produktionsbygg
npm run preview

# Lint
npm run lint

# Databas
npm run db:generate    # Generera Prisma Client
npm run db:migrate     # Kör migrations
npm run db:studio      # Öppna Prisma Studio
npm run db:push        # Push schema (utveckling)
```

## 📝 Användning

### Skapa en ny produktlansering

1. Gå till Dashboard
2. Klicka på "+ Ny produkt"
3. Fyll i:
   - GTIN (obligatoriskt)
   - Produktnamn (obligatoriskt)
   - Lanseringsvecka och år
   - Kedja (valfritt)
   - Kategori (valfritt)
4. Klicka på "Skapa produkt"

Systemet genererar automatiskt alla aktiviteter baserat på standardmallen.

### Hantera aktiviteter

1. Öppna en produkt från Dashboard
2. Se alla aktiviteter med deadlines
3. Klicka på en aktivitet för att:
   - Ändra status (ej påbörjad → pågående → klart)
   - Tilldela ansvarig person
   - Lägga till kommentarer
   - Exportera till kalender

### Anpassa process

1. Gå till Inställningar (endast admin)
2. Välj en mall att redigera
3. Redigera aktiviteter:
   - Ändra namn, beskrivning, veckor före lansering
   - Lägg till nya aktiviteter
   - Ta bort aktiviteter

## 🔐 Säkerhet och behörigheter

- **Admin**: Kan redigera mallar, ändra alla produkter
- **Användare**: Kan skapa produkter, uppdatera status, lägga till kommentarer

## 🚢 Deployment

### GitHub Repository Setup

**Automatiskt (via script):**
```bash
./scripts/setup-github.sh
```

**Manuellt:**
1. Gå till https://github.com/organizations/kmhbg/repositories/new
2. Repository name: `launch-planner-nordic-fmcg`
3. Välj **Private**
4. Följ instruktioner för att pusha kod

### Deployment Alternativ

#### Azure Static Web Apps (Rekommenderat)
- Automatisk CI/CD via GitHub Actions
- Gratis tier för små applikationer
- Inbyggd CDN och SSL
- Se [AZURE_SETUP.md](./AZURE_SETUP.md) för detaljerade instruktioner

#### Azure App Service
- Full kontroll över servermiljö
- Stöd för Node.js backend
- Se [AZURE_SETUP.md](./AZURE_SETUP.md)

#### Docker
- Konsistent miljö
- Portabilitet mellan plattformar
- Se `Dockerfile` och `docker-compose.yml`

**För detaljerade deployment-instruktioner, se:**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Översikt och alternativ
- [AZURE_SETUP.md](./AZURE_SETUP.md) - Azure-specifik setup
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Databashantering

## 📄 Licens

Detta projekt är skapat för intern användning.

## 🤝 Bidrag

För förslag på förbättringar, öppna en issue eller skicka en pull request.

## 📞 Support

För frågor och support, kontakta utvecklingsteamet.

---

**Skapad med ❤️ för Nordic FMCG**

