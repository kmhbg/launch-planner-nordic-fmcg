#!/bin/bash

# Script för att skapa GitHub repository och pusha kod

set -e

ORG="kmhbg"
REPO="launch-planner-nordic-fmcg"
DESCRIPTION="Produktlanseringsplanerare för dagligvaruhandel i Norden - Microsoft Teams app"

echo "🚀 Setting up GitHub repository..."

# Kontrollera om git redan är initialiserat
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
fi

# Lägg till alla filer
echo "📝 Adding files..."
git add .

# Skapa initial commit om det inte finns
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
    echo "💾 Creating initial commit..."
    git commit -m "Initial commit: Launch Planner Nordic FMCG"
fi

# Kontrollera om GitHub CLI är installerad
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) is not installed."
    echo "📖 Install it from: https://cli.github.com/"
    echo ""
    echo "Or create repository manually:"
    echo "1. Go to: https://github.com/organizations/$ORG/repositories/new"
    echo "2. Repository name: $REPO"
    echo "3. Description: $DESCRIPTION"
    echo "4. Choose Private"
    echo "5. Click 'Create repository'"
    echo "6. Then run:"
    echo "   git remote add origin https://github.com/$ORG/$REPO.git"
    echo "   git push -u origin main"
    exit 1
fi

# Kontrollera om användaren är inloggad
if ! gh auth status &> /dev/null; then
    echo "🔐 Please login to GitHub CLI:"
    gh auth login
fi

# Skapa repository
echo "🔨 Creating repository $ORG/$REPO..."
gh repo create "$ORG/$REPO" \
    --private \
    --description "$DESCRIPTION" \
    --source=. \
    --remote=origin \
    --push

echo "✅ Repository created and code pushed!"
echo "🌐 View at: https://github.com/$ORG/$REPO"

