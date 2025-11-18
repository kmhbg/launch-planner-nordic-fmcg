# GitHub Actions - Komplett Översikt

## 📦 Alla Workflows (15 st)

### 🔄 CI/CD Workflows

1. **ci.yml** - Continuous Integration
   - Kör tester med coverage
   - Bygger applikationen
   - Trigger: Push/PR till main/develop

2. **code-quality.yml** - Code Quality
   - ESLint
   - TypeScript type check
   - Security audit
   - Trigger: Push/PR till main/develop

3. **deploy-preview.yml** - Preview Deployment
   - Skapar preview för varje PR
   - Trigger: PR öppnas/uppdateras

4. **azure-static-web-apps.yml** - Frontend Deployment
   - Deployar till Azure Static Web Apps
   - Trigger: Push till main

5. **azure-app-service.yml** - Backend Deployment
   - Deployar till Azure App Service
   - Trigger: Push till main

### 🤖 Automation Workflows

6. **auto-merge.yml** - Auto Merge
   - Automatisk merge av Dependabot PRs
   - Trigger: PR från Dependabot

7. **auto-assign.yml** - Auto Assign
   - Automatisk tilldelning av issues/PRs
   - Trigger: Issue/PR öppnas

8. **comment-on-pr.yml** - PR Comments
   - Välkomstkommentar på PRs
   - Trigger: PR öppnas

9. **pr-checks.yml** - PR Validation
   - Validerar PR-storlek
   - Kontrollerar labels
   - Trigger: PR öppnas/uppdateras

10. **notify-on-failure.yml** - Failure Notifications
    - Skapar issue vid CI-fel
    - Trigger: CI workflow failar

### 🔧 Maintenance Workflows

11. **dependency-update.yml** - Dependency Updates
    - Kontrollerar outdated packages
    - Trigger: Varje måndag 09:00 UTC

12. **stale.yml** - Mark Stale
    - Markerar inaktiva issues/PRs
    - Stänger efter 7 dagar
    - Trigger: Varje dag 00:00 UTC

13. **release.yml** - Release Automation
    - Skapar release vid tag
    - Genererar changelog
    - Trigger: Push av tag (v*.*.*)

14. **sync-labels.yml** - Sync Labels
    - Synkar labels från JSON
    - Trigger: Manuell eller vid push av labels.json

### 📋 Templates & Config

15. **Issue Templates**
    - Bug Report template
    - Feature Request template

16. **PR Template**
    - Standardiserad PR template

17. **Dependabot Config**
    - Automatiska dependency updates
    - Veckovis kontroll

18. **CODEOWNERS**
    - Automatisk code review assignment

## 🎯 Vad Händer Automatiskt?

### Vid Push till main:
1. ✅ CI körs (tester + build)
2. ✅ Code quality checks
3. ✅ Deployment till Azure (om CI passerar)

### Vid PR:
1. ✅ CI körs
2. ✅ Code quality checks
3. ✅ Preview deployment
4. ✅ PR validation
5. ✅ Välkomstkommentar
6. ✅ Auto-assign reviewers

### Veckovis:
1. ✅ Dependency check (måndagar)
2. ✅ Stale issues check (dagligen)

### Vid Tag:
1. ✅ Release skapas automatiskt
2. ✅ Changelog genereras
3. ✅ Release assets skapas

## 🚀 Kom igång

1. **Push till GitHub:**
   ```bash
   git add .
   git commit -m "feat: add GitHub Actions workflows"
   git push origin main
   ```

2. **Konfigurera Secrets:**
   - Gå till Settings → Secrets
   - Lägg till `AZURE_STATIC_WEB_APPS_API_TOKEN`

3. **Aktivera Dependabot:**
   - Gå till Settings → Security → Dependabot
   - Aktivera "Dependabot alerts"

4. **Testa workflows:**
   ```bash
   # Skapa en test PR
   gh pr create --title "Test PR" --body "Testing workflows"
   ```

## 📊 Monitoring

Kolla workflow-status:
```bash
gh run list
gh run watch
```

Visa workflow-detaljer:
```bash
gh run view <run-id>
```

## 🎓 Tips

- Alla workflows är konfigurerade och redo att användas
- Justera triggers och schedules efter behov
- Lägg till fler secrets om du behöver fler integrations
- Anpassa CODEOWNERS för ditt team

