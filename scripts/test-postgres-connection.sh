#!/bin/bash

# Test PostgreSQL connection manuellt

echo "🔍 Testar PostgreSQL anslutning..."
echo ""

# Läs från .env
if [ -f ".env" ]; then
    DB_URL=$(grep "DATABASE_URL" .env | cut -d'=' -f2 | tr -d '"')
    echo "📋 Connection string från .env:"
    echo "   ${DB_URL:0:80}..."
    echo ""
    
    # Extrahera komponenter
    if [[ $DB_URL == postgresql://* ]]; then
        # Parse connection string
        USER_PASS=$(echo $DB_URL | sed 's|postgresql://\([^@]*\)@.*|\1|')
        HOST_DB=$(echo $DB_URL | sed 's|postgresql://[^@]*@\([^/]*\)/\([^?]*\).*|\1 \2|')
        
        USERNAME=$(echo $USER_PASS | cut -d':' -f1)
        PASSWORD=$(echo $USER_PASS | cut -d':' -f2)
        HOST=$(echo $HOST_DB | cut -d' ' -f1 | cut -d':' -f1)
        PORT=$(echo $HOST_DB | cut -d' ' -f1 | cut -d':' -f2)
        DATABASE=$(echo $HOST_DB | cut -d' ' -f2)
        
        echo "🔧 Parsade komponenter:"
        echo "   Host: $HOST"
        echo "   Port: ${PORT:-5432}"
        echo "   Database: $DATABASE"
        echo "   Username: $USERNAME"
        echo "   Password: ${PASSWORD:0:5}..."
        echo ""
        
        # Testa med psql om det finns
        if command -v psql &> /dev/null; then
            echo "🧪 Testar med psql..."
            export PGPASSWORD="$PASSWORD"
            if psql -h "$HOST" -p "${PORT:-5432}" -U "$USERNAME" -d "$DATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
                echo "✅ psql anslutning lyckades!"
            else
                echo "❌ psql anslutning misslyckades"
                echo ""
                echo "💡 Testa manuellt:"
                echo "   psql -h $HOST -p ${PORT:-5432} -U '$USERNAME' -d $DATABASE"
            fi
        else
            echo "⚠️ psql finns inte installerat"
            echo ""
            echo "💡 Installera PostgreSQL client:"
            echo "   brew install postgresql  # macOS"
            echo "   apt-get install postgresql-client  # Linux"
        fi
    fi
else
    echo "❌ .env fil saknas"
fi

echo ""
echo "📝 Tips för felsökning:"
echo "   1. Kontrollera att PostgreSQL-servern körs"
echo "   2. Kontrollera nätverksanslutning: telnet $HOST ${PORT:-5432}"
echo "   3. Kontrollera användarnamn och lösenord"
echo "   4. Kontrollera att databasen finns: CREATE DATABASE launch_planner;"
echo "   5. Kontrollera behörigheter för användaren"

