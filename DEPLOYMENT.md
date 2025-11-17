# Deployment Guide - Launch Planner Nordic FMCG

## GitHub Repository Setup

### 1. Skapa Repository via GitHub CLI

```bash
# Installera GitHub CLI om du inte har det
brew install gh  # macOS
# eller
# https://cli.github.com/

# Logga in
gh auth login

# Skapa repository i organisationen kmhbg
gh repo create kmhbg/launch-planner-nordic-fmcg \
  --private \
  --description "Produktlanseringsplanerare för dagligvaruhandel i Norden - Microsoft Teams app" \
  --source=. \
  --remote=origin \
  --push
```

### 2. Eller skapa via GitHub Web UI

1. Gå till https://github.com/organizations/kmhbg/repositories/new
2. Repository name: `launch-planner-nordic-fmcg`
3. Description: "Produktlanseringsplanerare för dagligvaruhandel i Norden - Microsoft Teams app"
4. Välj **Private**
5. Klicka "Create repository"
6. Följ instruktionerna för att pusha kod:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/kmhbg/launch-planner-nordic-fmcg.git
git push -u origin main
```

## Deployment Alternativ

### Alternativ 1: Azure Static Web Apps (Rekommenderat för React-appar)

**Fördelar:**
- Gratis tier för små applikationer
- Automatisk CI/CD via GitHub Actions
- Inbyggd CDN
- Serverless functions support
- Enkel konfiguration

**Setup:**
1. Skapa Azure Static Web App via Azure Portal
2. Koppla till GitHub repository
3. Konfigurera build settings (se `.github/workflows/azure-static-web-apps.yml`)
4. Sätt miljövariabler i Azure Portal

### Alternativ 2: Azure App Service

**Fördelar:**
- Full kontroll över servermiljö
- Stöd för Node.js backend
- Enkel skalning
- Integration med Azure SQL/PostgreSQL

**Setup:**
1. Skapa App Service via Azure Portal
2. Konfigurera deployment från GitHub
3. Sätt miljövariabler
4. Konfigurera databas (Azure SQL/PostgreSQL)

### Alternativ 3: Docker + Azure Container Instances / AKS

**Fördelar:**
- Konsistent miljö
- Enkel lokal utveckling
- Skalbarhet
- Portabilitet

**Setup:**
1. Bygg Docker image
2. Push till Azure Container Registry
3. Deploy till ACI eller AKS

### Alternativ 4: Vercel / Netlify (Enklast)

**Fördelar:**
- Mycket enkelt
- Automatisk CI/CD
- Gratis tier
- Snabb setup

**Nackdelar:**
- Begränsad kontroll
- Serverless functions kan vara begränsade

## Rekommenderad Arkitektur för Företag

### Produktionsmiljö

```
┌─────────────────────────────────────────┐
│         Azure Static Web Apps           │
│         (Frontend - React)              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Azure Functions / API              │
│      (Backend API för databas)          │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Azure SQL / PostgreSQL             │
│      (Prisma + Database)                 │
└─────────────────────────────────────────┘
```

### Miljövariabler

**Development:**
- SQLite (lokalt)
- `.env` fil

**Production:**
- Azure SQL eller PostgreSQL
- Azure Key Vault för secrets
- Environment variables i Azure Portal

## Deployment Checklist

- [ ] Repository skapad på GitHub
- [ ] CI/CD pipeline konfigurerad
- [ ] Databas skapad (Azure SQL/PostgreSQL)
- [ ] Miljövariabler konfigurerade
- [ ] Secrets i Azure Key Vault
- [ ] Custom domain konfigurerad (valfritt)
- [ ] SSL-certifikat (automatiskt med Azure)
- [ ] Monitoring och logging konfigurerad
- [ ] Backup-strategi för databas
- [ ] Disaster recovery plan

## Nästa Steg

1. Välj deployment-alternativ
2. Följ specifik setup-guide nedan
3. Konfigurera CI/CD
4. Testa deployment
5. Konfigurera monitoring

