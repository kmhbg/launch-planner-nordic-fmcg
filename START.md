# Startguide - Launch Planner

## Snabbstart (Rekommenderat)

Starta både frontend och backend samtidigt:

```bash
npm run dev:full
```

Detta startar:
- **Frontend** på http://localhost:3000
- **Backend** på http://localhost:3001

## Starta separat

Om du vill köra dem i separata terminaler:

### Terminal 1 - Frontend
```bash
npm run dev
```
Öppnar http://localhost:3000

### Terminal 2 - Backend
```bash
npm run server
```
Startar backend på http://localhost:3001

## Felsökning

### Port redan använd
Om du får fel om att porten redan är använd:

```bash
# Stoppa alla processer
lsof -ti:3000,3001 | xargs kill -9

# Starta igen
npm run dev:full
```

### Backend svarar inte
Kontrollera att backend körs:
```bash
curl http://localhost:3001/api/database/config
```

Om det inte svarar, starta backend manuellt:
```bash
npm run server
```

### Frontend laddar inte
Kontrollera att Vite körs:
```bash
curl http://localhost:3000
```

Om det inte svarar, starta frontend manuellt:
```bash
npm run dev
```

## Vanliga kommandon

```bash
# Starta allt
npm run dev:full

# Stoppa allt (Ctrl+C i terminalen)

# Generera Prisma Client
npm run db:generate

# Pusha schema till databas
npm run db:push

# Öppna Prisma Studio (databas GUI)
npm run db:studio
```

