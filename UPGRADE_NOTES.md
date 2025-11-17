# Uppgraderingsanteckningar

## ESLint 9 Migration

Projektet har uppgraderats från ESLint 8 till ESLint 9 med flat config format.

### Ändringar:
- ✅ ESLint uppgraderad till v9.15.0
- ✅ Migrerat från `.eslintrc.cjs` till `eslint.config.js` (flat config)
- ✅ Använder nu `typescript-eslint` paketet istället för separata plugin/parser
- ✅ Uppdaterat till `eslint-plugin-react-hooks` v5.0.0
- ✅ Lagt till `@eslint/js` och `globals` paket

### Nya dependencies:
- `@eslint/js`: ^9.15.0
- `typescript-eslint`: ^7.18.0 (ersätter @typescript-eslint/eslint-plugin och @typescript-eslint/parser)
- `globals`: ^15.11.0

### Andra uppdateringar:
- React: ^18.2.0 → ^18.3.1
- react-router-dom: ^6.20.0 → ^6.28.0
- TypeScript: ^5.2.2 → ^5.6.3
- Vite: ^5.0.8 → ^5.4.8
- Zustand: ^4.4.7 → ^4.5.4
- jspdf: ^2.5.1 → ^2.5.2
- recharts: ^2.10.3 → ^2.12.7

### Noteringar:
- `date-fns` behålls på v2.30.0 eftersom v4 har breaking changes
- Varningar om deprecated packages (inflight, rimraf, glob) kommer från transitiva dependencies och kan inte direkt uppdateras
- Dessa varningar är inte kritiska och påverkar inte funktionaliteten

### Nästa steg:
1. Kör `npm install` för att installera uppdaterade paket
2. Testa att `npm run lint` fungerar korrekt
3. Verifiera att appen bygger och körs: `npm run build && npm run dev`

