# Parallell Körning i GitHub Actions

## Nuvarande Konfiguration

### ✅ Parallellt (körs samtidigt):
- **code-quality.yml**: `lint`, `typecheck`, `security` - alla körs parallellt
- **Separata workflows**: Alla workflows körs parallellt med varandra

### ⏳ Sekventiellt (körs i ordning):
- **ci.yml**: `test` → `build` (build väntar på test)

## Optimering för Maximal Parallellisering

### Förslag: `parallel-ci.yml`

Denna workflow optimerar för parallell körning:

```
┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐
│  lint   │  │ typecheck│  │  test   │  │ security │
└────┬────┘  └─────┬─────┘  └────┬────┘  └─────┬────┘
     │            │              │              │
     └────────────┴──────────────┴──────────────┘
                    │
              ┌─────▼─────┐
              │   build   │
              └─────┬─────┘
                    │
        ┌───────────┴───────────┐
        │                       │
  ┌─────▼─────┐         ┌──────▼──────┐
  │ deploy-   │         │  deploy-    │
  │ frontend  │         │  backend   │
  └───────────┘         └────────────┘
```

### Tidsbesparing

**Sekventiell (nuvarande ci.yml):**
- lint: ~2 min
- test: ~5 min
- typecheck: ~2 min
- build: ~3 min
- **Totalt: ~12 min** (om allt körs sekventiellt)

**Parallell (parallel-ci.yml):**
- lint, test, typecheck, security: **~5 min** (körs parallellt)
- build: ~3 min (efter kvalitetskontroller)
- **Totalt: ~8 min** (sparar ~4 min = 33% snabbare!)

## Aktivera Parallell CI

### Alternativ 1: Ersätt ci.yml
```bash
mv .github/workflows/ci.yml .github/workflows/ci.yml.backup
mv .github/workflows/parallel-ci.yml .github/workflows/ci.yml
```

### Alternativ 2: Använd båda
- `ci.yml` - Enklare, sekventiell
- `parallel-ci.yml` - Optimerad, parallell

## Matrix Strategy (för ännu mer parallellisering)

För att testa mot flera Node-versioner parallellt:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
  fail-fast: false
```

## Best Practices

1. **Använd `needs` sparsamt** - bara när det verkligen behövs
2. **Timeout** - Sätt timeout för att undvika hängande jobs
3. **Artifacts** - Dela artifacts mellan jobs när möjligt
4. **Cache** - Använd cache för dependencies
5. **Conditional execution** - Använd `if` för att hoppa över onödiga jobs

## Monitoring

Kolla workflow-tider:
```bash
gh run list --limit 10
gh run view <run-id> --log
```

Jämför tider mellan sekventiell och parallell körning.

