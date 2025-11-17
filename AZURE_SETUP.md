# Azure Deployment Setup Guide

## 1. Azure Static Web Apps (Rekommenderat)

### Steg 1: Skapa Static Web App

1. Gå till Azure Portal: https://portal.azure.com
2. Klicka "Create a resource"
3. Sök på "Static Web App"
4. Klicka "Create"
5. Fyll i:
   - **Subscription**: Välj din subscription
   - **Resource Group**: Skapa ny eller välj befintlig
   - **Name**: `launch-planner-nordic-fmcg`
   - **Plan type**: Free (för utveckling) eller Standard (för produktion)
   - **Region**: Välj närmaste region (t.ex. West Europe)
   - **Source**: GitHub
   - **GitHub account**: Logga in och auktorisera
   - **Organization**: `kmhbg`
   - **Repository**: `launch-planner-nordic-fmcg`
   - **Branch**: `main`
   - **Build Presets**: Custom
   - **App location**: `/`
   - **Api location**: (lämna tomt)
   - **Output location**: `dist`

6. Klicka "Review + create" och sedan "Create"

### Steg 2: Konfigurera Miljövariabler

1. Gå till din Static Web App i Azure Portal
2. Gå till "Configuration" → "Application settings"
3. Lägg till:
   - `DATABASE_URL`: Connection string till din databas
   - `NODE_ENV`: `production`
   - Andra miljövariabler som behövs

### Steg 3: Hämta Deployment Token

1. Gå till din Static Web App
2. Klicka på "Manage deployment token"
3. Kopiera tokenet
4. Gå till GitHub repository → Settings → Secrets → Actions
5. Lägg till secret: `AZURE_STATIC_WEB_APPS_API_TOKEN` med tokenet

### Steg 4: Konfigurera Databas

#### Alternativ A: Azure SQL Database

1. Skapa Azure SQL Database i Azure Portal
2. Notera connection string
3. Uppdatera `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlserver"
     url      = env("DATABASE_URL")
   }
   ```
4. Kör migrations:
   ```bash
   DATABASE_URL="sqlserver://..." npm run db:migrate
   ```

#### Alternativ B: Azure Database for PostgreSQL

1. Skapa Azure Database for PostgreSQL
2. Notera connection string
3. Uppdatera `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Kör migrations:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate
   ```

## 2. Azure App Service

### Steg 1: Skapa App Service

1. Gå till Azure Portal
2. "Create a resource" → "Web App"
3. Fyll i:
   - **Name**: `launch-planner-nordic-fmcg`
   - **Runtime stack**: Node.js 20 LTS
   - **Operating System**: Linux
   - **Region**: Välj region
4. Klicka "Review + create" → "Create"

### Steg 2: Konfigurera Deployment

1. Gå till App Service → "Deployment Center"
2. Välj "GitHub"
3. Auktorisera och välj repository
4. Branch: `main`
5. Klicka "Save"

### Steg 3: Konfigurera Miljövariabler

1. Gå till "Configuration" → "Application settings"
2. Lägg till miljövariabler
3. Klicka "Save"

### Steg 4: Hämta Publish Profile

1. Gå till App Service → "Get publish profile"
2. Ladda ner filen
3. Gå till GitHub → Settings → Secrets → Actions
4. Lägg till secret: `AZURE_WEBAPP_PUBLISH_PROFILE` med innehållet från filen

## 3. Azure Container Instances (Docker)

### Steg 1: Skapa Azure Container Registry

```bash
az acr create --resource-group <resource-group> --name <registry-name> --sku Basic
```

### Steg 2: Bygg och Push Image

```bash
az acr build --registry <registry-name> --image launch-planner:latest .
```

### Steg 3: Skapa Container Instance

```bash
az container create \
  --resource-group <resource-group> \
  --name launch-planner \
  --image <registry-name>.azurecr.io/launch-planner:latest \
  --registry-login-server <registry-name>.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --dns-name-label launch-planner \
  --ports 80 \
  --environment-variables DATABASE_URL="..."
```

## 4. Azure Key Vault (För Secrets)

### Steg 1: Skapa Key Vault

1. Azure Portal → "Create a resource" → "Key Vault"
2. Fyll i information och skapa

### Steg 2: Lägg till Secrets

1. Gå till Key Vault → "Secrets"
2. Klicka "Generate/Import"
3. Lägg till:
   - `DATABASE_URL`
   - Andra känsliga värden

### Steg 3: Konfigurera Access

1. Gå till "Access policies"
2. Lägg till din App Service/Static Web App
3. Ge "Get" permission för secrets

## 5. Monitoring och Logging

### Application Insights

1. Skapa Application Insights resource
2. Kopiera Instrumentation Key
3. Lägg till i miljövariabler: `APPINSIGHTS_INSTRUMENTATIONKEY`

### Log Analytics

1. Skapa Log Analytics workspace
2. Koppla till App Service/Static Web App
3. Konfigurera loggning

## 6. Custom Domain och SSL

1. Gå till App Service → "Custom domains"
2. Lägg till din domän
3. Följ instruktioner för DNS-konfiguration
4. SSL-certifikat hanteras automatiskt av Azure

## 7. Backup och Disaster Recovery

### Databas Backup

1. Azure SQL/PostgreSQL har automatiska backups
2. Konfigurera backup retention i Azure Portal
3. Testa restore-procedur regelbundet

### App Backup

1. App Service → "Backup"
2. Konfigurera regelbundna backups
3. Spara backups i Azure Storage

## Checklist för Production

- [ ] Static Web App / App Service skapad
- [ ] Databas skapad och konfigurerad
- [ ] Migrations körda
- [ ] Miljövariabler konfigurerade
- [ ] Secrets i Key Vault
- [ ] CI/CD pipeline fungerar
- [ ] Custom domain konfigurerad
- [ ] SSL-certifikat aktivt
- [ ] Monitoring konfigurerad
- [ ] Backup-strategi på plats
- [ ] Logging konfigurerad
- [ ] Security scanning aktiverad
- [ ] Performance testing genomförd

