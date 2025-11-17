# Teknisk arkitektur - Launch Planner Nordic FMCG

## 🏗️ Översikt

Launch Planner är byggd som en modern React-applikation med TypeScript, designad för att fungera både som fristående webbapp och som Microsoft Teams-integration.

## 📦 Teknisk stack

### Frontend
- **React 18**: UI-bibliotek med hooks
- **TypeScript**: Typ-säkerhet och bättre utvecklarupplevelse
- **Vite**: Snabb build tool och dev server
- **Zustand**: Lättvikts state management
- **date-fns**: Datumhantering och formatering
- **jsPDF**: PDF-generering
- **xlsx**: Excel-export
- **@microsoft/teams-js**: Microsoft Teams SDK

### Styling
- **Vanilla CSS**: Med CSS-variabler för design tokens
- **Modulär CSS**: En CSS-fil per komponent
- **Responsiv design**: Mobile-first approach

## 🗂️ Projektstruktur

```
launch-planner/
├── src/
│   ├── components/          # React-komponenter
│   │   ├── Dashboard.tsx    # Huvudöversikt
│   │   ├── ProductView.tsx  # Detaljvy för produkt
│   │   ├── TimelineView.tsx # Tidslinje-vy
│   │   ├── TaskList.tsx     # Lista över aktiviteter
│   │   ├── Settings.tsx     # Inställningar (admin)
│   │   ├── Layout.tsx       # Huvudlayout med navigation
│   │   ├── ProductCard.tsx  # Produktkort-komponent
│   │   └── ProductForm.tsx  # Formulär för ny produkt
│   ├── store/              # State management
│   │   └── store.ts         # Zustand store
│   ├── types/               # TypeScript-typer
│   │   └── index.ts         # Alla typer och interfaces
│   ├── utils/               # Hjälpfunktioner
│   │   ├── timeline.ts      # Tidslinje-beräkningar
│   │   └── export.ts        # Export-funktioner (PDF, Excel, ICS)
│   ├── styles/              # Globala stilar
│   │   └── global.css       # CSS-variabler och globala stilar
│   ├── App.tsx              # Huvudkomponent
│   └── main.tsx             # Entry point
├── manifest.json            # Microsoft Teams manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🧩 Datamodell

### Core Entities

#### Product
```typescript
{
  id: string
  gtin: string
  name: string
  launchWeek: number
  launchYear: number
  launchDate: Date
  category?: string
  retailer?: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  activities: Activity[]
  createdAt: Date
  updatedAt: Date
  createdBy: string
}
```

#### Activity
```typescript
{
  id: string
  templateId: string
  productId: string
  name: string
  description: string
  deadline: Date
  deadlineWeek: number
  assigneeId?: string
  assigneeName?: string
  status: 'not_started' | 'in_progress' | 'completed'
  comments: Comment[]
  category: string
  order: number
}
```

#### Template
```typescript
{
  id: string
  name: string
  description: string
  activities: ActivityTemplate[]
  isDefault: boolean
  retailer?: string
}
```

## 🔄 State Management

Använder **Zustand** för enkel och effektiv state management:

### Store Structure
```typescript
{
  // Data
  products: Product[]
  users: User[]
  templates: Template[]
  currentUser: User | null
  
  // UI State
  selectedProductId: string | null
  viewMode: 'dashboard' | 'product' | 'timeline' | 'settings'
  
  // Actions
  setCurrentUser, addProduct, updateProduct, deleteProduct,
  updateActivity, addComment, setSelectedProduct, setViewMode,
  updateTemplate, createTemplate
}
```

### State Flow
1. Användare interagerar med UI
2. Komponent anropar store-action
3. Store uppdaterar state
4. Komponenter re-renderas automatiskt

## 🧮 Tidslinje-logik

### Beräkningar

#### Lanseringsdatum från vecka
```typescript
getLaunchDate(year: number, week: number): Date
```
Beräknar första dagen (måndag) i angiven vecka.

#### Deadline från veckor före lansering
```typescript
calculateDeadline(launchDate: Date, weeksBeforeLaunch: number): Date
```
Räknar baklänges från lanseringsdatum.

#### Generering av aktiviteter
```typescript
generateActivities(templates: ActivityTemplate[], product: Product): Activity[]
```
Skapar alla aktiviteter baserat på mall och produkt.

### ECR 16-veckorsprocess

Standardaktiviteter med veckor före lansering:
- -15: Avisering + artikeldata
- -13: Intern godkännande
- -12: Bilder + GS1-validering
- -11: Förpackningsgodkännande
- -10: Pris & villkor, Kundpresentation
- -8: Kundbeslut, listing
- -6: Prognos, logistikplan
- -4: Produktionsstart
- -2: Leverans till centrallager
- 0: Lansering

## 🔌 Microsoft Teams Integration

### SDK Initialisering
```typescript
microsoftTeams.app.initialize()
  .then(() => microsoftTeams.app.getContext())
  .then(context => {
    // Hämta användarinfo
    // Sätt användar-roll baserat på Teams-kontext
  })
```

### Manifest Configuration
- **Static Tabs**: Appen visas som en tab i Teams
- **Permissions**: `identity`, `messageTeamMembers`
- **Web Application Info**: Azure AD-integration (valfritt)

### Deployment
1. Bygg appen: `npm run build`
2. Deploy `dist/` till HTTPS-server
3. Uppdatera `manifest.json` med korrekt URL
4. Ladda upp till Teams App Catalog

## 📤 Export-funktioner

### PDF Export
- Använder jsPDF
- Genererar professionell lanseringsplan
- Inkluderar produktinfo och alla aktiviteter

### Excel Export
- Använder xlsx
- Exporterar alla produkter och aktiviteter
- Flera sheets: Sammanfattning + detaljer per produkt

### ICS Export
- Genererar .ics-fil för kalender
- En fil per aktivitet
- Kompatibel med Outlook, Google Calendar, etc.

## 🔐 Säkerhet och behörigheter

### Roller
- **Admin**: Full åtkomst, kan redigera mallar
- **User**: Kan skapa produkter, uppdatera status, kommentera

### Framtida förbättringar
- Azure AD-autentisering
- API med JWT-tokens
- Databas-integration
- Rollbaserad åtkomstkontroll (RBAC)

## 🗄️ Data persistence

### Nuvarande implementation
- **In-memory**: Data sparas i Zustand store
- Försvinner vid siduppdatering

### Framtida implementation
- **Backend API**: REST eller GraphQL
- **Databas**: PostgreSQL, MongoDB, eller Azure Cosmos DB
- **Caching**: LocalStorage för offline-stöd
- **Sync**: Real-time sync med backend

## 🧪 Testing (framtida)

### Enheter att testa
- Tidslinje-beräkningar
- Export-funktioner
- State management
- Komponenter (React Testing Library)

### E2E Testing
- Cypress eller Playwright
- Testa användarflöden
- Teams-integration

## 🚀 Performance

### Optimeringar
- **Code splitting**: Lazy loading av komponenter
- **Memoization**: React.memo för tunga komponenter
- **Virtual scrolling**: För långa listor (kan implementeras)
- **Image optimization**: För produktbilder (framtida)

### Bundle size
- Vite tree-shaking
- Minimal dependencies
- Code splitting per route

## 🔄 Framtida förbättringar

### Backend
- REST API eller GraphQL
- Databas-integration
- Användarhantering
- Notifikationer

### Funktioner
- Real-time collaboration
- Kommentar-system med @mentions
- Fil-uppladdning
- E-postnotifikationer
- Dashboard-widgets
- Rapporter och analytics
- Integration med andra system (ERP, PIM)

### UX
- Drag-and-drop för aktivitetsordning
- Keyboard shortcuts
- Dark mode
- Språkstöd (engelska, norska, danska)
- Sök och filter
- Bulk-operationer

## 📚 Dokumentation

- **README.md**: Kom igång-guide
- **DESIGN.md**: Design-dokumentation
- **ARCHITECTURE.md**: Denna fil
- **Kommentarer i kod**: JSDoc för viktiga funktioner

## 🛠️ Development Workflow

1. **Setup**: `npm install`
2. **Develop**: `npm run dev`
3. **Build**: `npm run build`
4. **Test**: `npm run lint`
5. **Deploy**: Upload `dist/` to server

## 🔍 Debugging

### Development Tools
- React DevTools
- Zustand DevTools (kan aktiveras)
- Browser DevTools
- TypeScript compiler

### Logging
- Console.log för development
- Error boundaries för production
- Sentry eller liknande för error tracking (framtida)

