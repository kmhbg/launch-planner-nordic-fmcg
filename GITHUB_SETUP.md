# GitHub Setup Guide - Launch Planner

Detta dokument beskriver alla GitHub Actions workflows och automation som är konfigurerade för projektet.

## 🚀 Snabbstart

### 1. Skapa GitHub Repository

```bash
# Om du inte redan har ett repo
gh repo create kmhbg/launch-planner --public --source=. --remote=origin
```

### 2. Konfigurera Secrets

Gå till **Settings → Secrets and variables → Actions** och lägg till:

- `AZURE_STATIC_WEB_APPS_API_TOKEN` - För Azure deployment
- `SNYK_TOKEN` (valfritt) - För säkerhetsaudit

### 3. Aktivera Branch Protection

Gå till **Settings → Branches** och skydda `main`-branchen:
- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ✅ Require branches to be up to date

## 📋 Workflows Översikt

### CI/CD
- ✅ **ci.yml** - Automatisk testning och build
- ✅ **code-quality.yml** - Linting, typecheck, security
- ✅ **deploy-preview.yml** - Preview för PRs
- ✅ **azure-static-web-apps.yml** - Production deployment (frontend)
- ✅ **azure-app-service.yml** - Production deployment (backend)

### Automation
- ✅ **auto-merge.yml** - Auto-merge dependency updates
- ✅ **auto-assign.yml** - Auto-assign issues/PRs
- ✅ **comment-on-pr.yml** - Välkomstkommentar på PRs
- ✅ **pr-checks.yml** - Validera PR-storlek och labels
- ✅ **notify-on-failure.yml** - Notifiera vid CI-fel

### Maintenance
- ✅ **dependency-update.yml** - Veckovis dependency-check
- ✅ **stale.yml** - Markera inaktiva issues/PRs
- ✅ **release.yml** - Automatisk release vid tag
- ✅ **sync-labels.yml** - Synka labels

## 🎯 Användning

### Skapa en Release

```bash
# 1. Uppdatera version i package.json
npm version patch  # eller minor, major

# 2. Push tag
git push --tags

# 3. Release skapas automatiskt med changelog
```

### Manuell Workflow Trigger

Via GitHub CLI:
```bash
gh workflow run "Dependency Updates"
gh workflow run "Sync Labels"
```

Via GitHub UI:
1. Gå till **Actions**
2. Välj workflow
3. Klicka **Run workflow**

### Testa Workflows Lokalt

Använd [act](https://github.com/nektos/act):
```bash
# Installera act
brew install act

# Testa CI workflow
act -j test

# Testa build
act -j build
```

## 📝 Issue Templates

Projektet har två issue templates:
- **Bug Report** - För att rapportera buggar
- **Feature Request** - För att föreslå nya funktioner

### Skapa Issue

```bash
# Via GitHub CLI
gh issue create --title "Bug: ..." --body "..." --label bug
gh issue create --title "Feature: ..." --body "..." --label enhancement
```

## 🔄 Pull Request Process

1. **Skapa branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Gör ändringar och commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push och skapa PR:**
   ```bash
   git push origin feature/my-feature
   gh pr create --title "Add new feature" --body "..."
   ```

4. **CI körs automatiskt:**
   - Tester körs
   - Code quality checks
   - Preview deployment skapas

5. **Efter review och approval:**
   - Merge PR
   - CI körs igen
   - Production deployment (om main branch)

## 🏷️ Labels

Projektet använder standardiserade labels:
- `bug` - Buggar
- `enhancement` - Nya funktioner
- `documentation` - Dokumentation
- `dependencies` - Dependency updates
- `ci` - CI/CD relaterat
- `security` - Säkerhet
- `good first issue` - Bra för nybörjare
- `help wanted` - Behöver hjälp

Synka labels:
```bash
gh workflow run "Sync Labels"
```

## 🔐 Security

### Dependabot

Dependabot är konfigurerad för:
- Automatiska dependency updates
- Security advisories
- Veckovis kontroll

Konfiguration: `.github/dependabot.yml`

### Security Scanning

Workflows inkluderar:
- `npm audit` - Kontrollerar sårbarheter
- Snyk integration (valfritt)

## 📊 Monitoring

### Workflow Status

Kolla workflow-status:
```bash
gh run list
gh run view <run-id>
```

### Metrics

GitHub Insights visar:
- Workflow success rate
- Average run time
- Most used workflows

## 🛠️ Troubleshooting

### Workflow failar

1. **Kolla logs:**
   ```bash
   gh run view <run-id> --log
   ```

2. **Testa lokalt:**
   ```bash
   act -j <job-name>
   ```

3. **Kolla secrets:**
   - Verifiera att alla secrets är satta
   - Kontrollera att secrets har rätt värden

### CI failar

Vanliga orsaker:
- Tester failar → Fixa testerna
- Linting errors → Kör `npm run lint`
- Type errors → Kör `npx tsc --noEmit`
- Missing dependencies → Kör `npm install`

## 📚 Ytterligare Resurser

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [GitHub CLI Documentation](https://cli.github.com/manual/)

## 🎓 Best Practices

1. **Alltid kör tester lokalt innan push**
2. **Använd semantiska commit messages**
3. **Skapa små, fokuserade PRs**
4. **Lägg till labels på issues/PRs**
5. **Review PRs innan merge**
6. **Följ branch protection rules**

