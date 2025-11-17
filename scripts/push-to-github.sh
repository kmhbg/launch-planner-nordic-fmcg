#!/bin/bash

# Script för att pusha kod till GitHub

set -e

ORG="kmhbg"
REPO="launch-planner-nordic-fmcg"

echo "🚀 Preparing to push to GitHub..."

# Kontrollera om git är initialiserat
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
fi

# Lägg till alla filer
echo "📝 Adding files..."
git add -A

# Skapa commit om det finns ändringar
if ! git diff --staged --quiet; then
    echo "💾 Creating commit..."
    git commit -m "Initial commit: Launch Planner Nordic FMCG with database support"
else
    echo "ℹ️  No changes to commit"
fi

# Kontrollera om remote finns
if ! git remote get-url origin &> /dev/null; then
    echo "🔗 Adding remote repository..."
    
    # Kontrollera om GitHub CLI är installerad
    if command -v gh &> /dev/null; then
        echo "📦 Creating repository via GitHub CLI..."
        
        # Kontrollera om användaren är inloggad
        if ! gh auth status &> /dev/null; then
            echo "🔐 Please login to GitHub CLI:"
            gh auth login
        fi
        
        # Skapa repository
        gh repo create "$ORG/$REPO" \
            --private \
            --description "Produktlanseringsplanerare för dagligvaruhandel i Norden - Microsoft Teams app" \
            --source=. \
            --remote=origin \
            --push
        
        echo "✅ Repository created and code pushed!"
    else
        echo "⚠️  GitHub CLI (gh) is not installed."
        echo ""
        echo "Please create repository manually:"
        echo "1. Go to: https://github.com/organizations/$ORG/repositories/new"
        echo "2. Repository name: $REPO"
        echo "3. Choose Private"
        echo "4. Click 'Create repository'"
        echo ""
        echo "Then run:"
        echo "  git remote add origin https://github.com/$ORG/$REPO.git"
        echo "  git push -u origin main"
        exit 1
    fi
else
    echo "📤 Pushing to existing repository..."
    git push -u origin main
    echo "✅ Code pushed successfully!"
fi

echo ""
echo "🌐 Repository: https://github.com/$ORG/$REPO"
echo ""
echo "📋 Next steps:"
echo "1. Configure Azure deployment (see AZURE_SETUP.md)"
echo "2. Set up CI/CD secrets in GitHub"
echo "3. Deploy to Azure"

