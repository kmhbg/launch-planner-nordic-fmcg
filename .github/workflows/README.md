# GitHub Actions Workflows

Detta dokument beskriver alla GitHub Actions workflows i projektet.

## CI/CD Workflows

### `ci.yml` - Continuous Integration
- **Trigger:** Push/PR till main eller develop
- **Jobs:**
  - Test: Kör alla tester med coverage
  - Build: Bygger applikationen
- **Användning:** Automatisk testning och build vid varje ändring

### `code-quality.yml` - Code Quality Checks
- **Trigger:** Push/PR till main eller develop
- **Jobs:**
  - Lint: Kör ESLint
  - Typecheck: TypeScript type checking
  - Security: Säkerhetsaudit
- **Användning:** Säkerställer kodkvalitet

### `deploy-preview.yml` - Preview Deployments
- **Trigger:** PR öppnas/uppdateras
- **Användning:** Skapar preview-miljö för varje PR

## Deployment Workflows

### `azure-static-web-apps.yml` - Azure Static Web Apps
- **Trigger:** Push till main
- **Användning:** Deployar frontend till Azure Static Web Apps

### `azure-app-service.yml` - Azure App Service
- **Trigger:** Push till main
- **Användning:** Deployar backend till Azure App Service

## Maintenance Workflows

### `dependency-update.yml` - Dependency Updates
- **Trigger:** Varje måndag kl 09:00 UTC
- **Användning:** Kontrollerar och uppdaterar dependencies

### `stale.yml` - Mark Stale Issues
- **Trigger:** Varje dag kl 00:00 UTC
- **Användning:** Markerar och stänger inaktiva issues/PRs

## Automation Workflows

### `auto-merge.yml` - Auto Merge Dependencies
- **Trigger:** PR från Dependabot
- **Användning:** Automatisk merge av dependency updates

### `auto-assign.yml` - Auto Assign
- **Trigger:** Issue/PR öppnas
- **Användning:** Automatisk tilldelning baserat på labels

### `comment-on-pr.yml` - PR Comments
- **Trigger:** PR öppnas
- **Användning:** Lägger till välkomstkommentar på PRs

### `pr-checks.yml` - PR Validation
- **Trigger:** PR öppnas/uppdateras
- **Användning:** Validerar PR-storlek och labels

### `notify-on-failure.yml` - Failure Notifications
- **Trigger:** CI workflow failar
- **Användning:** Skapar issue när CI failar

### `release.yml` - Release Automation
- **Trigger:** Push av tag (v*.*.*)
- **Användning:** Skapar release med changelog

## Konfiguration

### Secrets som behövs

För att workflows ska fungera behöver du konfigurera följande secrets i GitHub:

1. **AZURE_STATIC_WEB_APPS_API_TOKEN** - För Azure deployment
2. **SNYK_TOKEN** (valfritt) - För säkerhetsaudit
3. **GITHUB_TOKEN** - Skapas automatiskt av GitHub

### Branch Protection

Rekommenderade branch protection rules för `main`:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators

## Användning

### Manuell trigger

Vissa workflows kan triggas manuellt:
```bash
# Via GitHub CLI
gh workflow run "Dependency Updates"
```

### Lokal testning

Testa workflows lokalt med [act](https://github.com/nektos/act):
```bash
act -j test
```

