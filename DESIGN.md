# Design-dokumentation - Launch Planner Nordic FMCG

## 🎨 Designfilosofi

Launch Planner följer en **skandinavisk, modern och minimalistisk** designfilosofi med fokus på:
- **Enkelhet**: Tydlig information, inga onödiga element
- **Luftighet**: Generös whitespace och luftiga listor
- **Funktionalitet**: Design som stödjer användarens arbetsflöde
- **Konsistens**: Enhetlig design genom hela appen

## 🎨 Färgpalett

### Primära färger
- **Bakgrund**: `#ffffff` (vit)
- **Sekundär bakgrund**: `#f8f9fa` (mycket ljusgrå)
- **Tertiär bakgrund**: `#f1f3f5` (ljusgrå)
- **Text primär**: `#212529` (nästan svart)
- **Text sekundär**: `#6c757d` (mörkgrå)
- **Text tertiär**: `#adb5bd` (ljusgrå)

### Accentfärger
- **Primär accent**: `#0066cc` (blå) - används för länkar, knappar, framsteg
- **Hover**: `#0052a3` (mörkare blå)
- **Success**: `#28a745` (grön) - för klara aktiviteter
- **Warning**: `#ffc107` (gul) - för pågående aktiviteter
- **Danger**: `#dc3545` (röd) - för varningar och försenade aktiviteter
- **Info**: `#17a2b8` (cyan) - för information

### Statusfärger
- **Ej påbörjad**: `#adb5bd` (ljusgrå)
- **Pågående**: `#ffc107` (gul)
- **Klart**: `#28a745` (grön)

## 📐 Spacing-system

Använder ett konsekvent 4px-baserat spacing-system:
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px

## 🔤 Typografi

### Font-familj
Systemfonts för bästa prestanda och konsistens:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
  'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
  'Helvetica Neue', sans-serif;
```

### Font-storlekar
- **H1**: 2rem (32px) - Huvudrubriker
- **H2**: 1.5rem (24px) - Sektioner
- **H3**: 1.25rem (20px) - Undersektioner
- **Body**: 0.875rem (14px) - Huvudtext
- **Small**: 0.75rem (12px) - Sekundär text, badges

### Font-vikter
- **Normal**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## 🎯 Komponentdesign

### Kort (Cards)
- Vit bakgrund
- Tunn border (`1px solid #e9ecef`)
- Rundade hörn (`12px`)
- Lätt skugga som ökar vid hover
- Padding: `24px`

### Knappar
- **Primär**: Blå bakgrund, vit text
- **Sekundär**: Transparent med blå border och text
- **Standard**: Vit bakgrund med border
- Rundade hörn (`8px`)
- Padding: `8px 16px`
- Smooth hover-transitioner

### Input-fält
- Vit bakgrund
- Tunn border som blir blå vid fokus
- Rundade hörn (`8px`)
- Padding: `8px 16px`
- Fokus-ring med ljusblå skugga

### Badges
- Liten padding (`4px 8px`)
- Rundade hörn (`4px`)
- Färgkodad bakgrund med 20% opacity
- Uppercase text med letter-spacing

## 📱 Responsiv design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile-anpassningar
- En kolumn-layout
- Stackade element
- Touch-vänliga knappar (min 44px)
- Förenklad navigation

## 🎭 Inspiration

Designen är inspirerad av:
- **Notion**: Ren layout, luftig typografi, subtila interaktioner
- **Asana Timeline**: Tidslinje-visualisering, statusfärger
- **Linear**: Minimalistisk, fokus på innehåll
- **Microsoft Teams**: Designlinje och komponenter

## 🔄 Interaktioner

### Hover-states
- Subtila förändringar (färg, skugga, transform)
- Transition-tid: `0.2s ease`

### Fokus-states
- Tydlig fokus-ring för tillgänglighet
- Blå accentfärg

### Loading-states
- Skeleton screens (kan implementeras senare)
- Spinner för asynkrona operationer

## 📊 Layout-principer

### Grid-system
- Max-width: `1400px` för huvudinnehåll
- Centrerad med auto-margins
- Responsiv grid med `auto-fill` och `minmax`

### Whitespace
- Generös användning av whitespace
- Minst `16px` mellan relaterade element
- `24px` mellan sektioner

## 🎨 Visuell hierarki

1. **Primär**: Huvudrubriker, viktiga knappar
2. **Sekundär**: Underrubriker, sekundära knappar
3. **Tertiär**: Metadata, sekundär information

## ♿ Tillgänglighet

- Kontrastförhållanden enligt WCAG AA
- Keyboard-navigation
- Screen reader-vänlig
- Fokus-indikatorer
- Semantisk HTML

## 🖼️ Ikoner

För framtida implementering:
- Använd Microsoft Fluent UI Icons eller liknande
- Konsistent storlek: `16px` eller `20px`
- Färg: Följer text-färg eller accent-färg

## 📐 Specifika komponenter

### Dashboard
- Grid-layout med produktkort
- Statistik-kort överst
- Filter-tabs för status

### Produktvy
- Tydlig header med produktinfo
- Framstegsbar
- Lista över aktiviteter med expanderbar detaljvy

### Tidslinje
- Vertikal tidslinje med veckor
- Aktivitet-kort med status-indikator
- Klickbar för att öppna produktvy

### Inställningar
- Två-kolumns layout (sidebar + huvudinnehåll)
- Formulär för att redigera mallar
- Drag-and-drop för att ändra ordning (kan implementeras senare)

## 🎨 Färgkodning

### Status
- **Grönt**: Klart, framgång
- **Gult**: Pågående, varning
- **Rött**: Försenad, fel
- **Grått**: Ej påbörjad, inaktiv

### Kategorier
Aktiviteter kan kategoriseras med färger:
- Artikeldata: Blå
- Godkännande: Orange
- Kommersiell: Lila
- Kundrelation: Grön
- Logistik: Cyan
- Produktion: Röd
- Lansering: Guld

## 📝 Design-tokens

Alla design-värden är definierade som CSS-variabler i `global.css` för enkel anpassning och konsistens.

