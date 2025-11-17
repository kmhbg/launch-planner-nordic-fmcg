import React, { useState, useEffect } from 'react';
import './DatabaseSettings.css';

interface DatabaseConfig {
  provider: 'sqlite' | 'postgresql' | 'mysql' | 'sqlserver';
  url: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export const DatabaseSettings: React.FC = () => {
  const [config, setConfig] = useState<DatabaseConfig>({
    provider: 'sqlite',
    url: 'file:./dev.db',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Ladda sparad konfiguration från localStorage
    const saved = localStorage.getItem('dbConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (e) {
        console.error('Failed to load saved config', e);
      }
    }
  }, []);

  const handleProviderChange = (provider: DatabaseConfig['provider']) => {
    const newConfig: DatabaseConfig = {
      provider,
      url: '',
      host: '',
      port: provider === 'postgresql' ? 5432 : provider === 'mysql' ? 3306 : provider === 'sqlserver' ? 1433 : undefined,
      database: '',
      username: '',
      password: '',
    };

    if (provider === 'sqlite') {
      newConfig.url = 'file:./dev.db';
    }

    setConfig(newConfig);
    setTestResult(null);
  };

  const buildConnectionString = (): string => {
    if (config.provider === 'sqlite') {
      return config.url;
    }

    if (config.provider === 'postgresql') {
      if (config.username && config.password && config.host && config.database) {
        return `postgresql://${config.username}:${config.password}@${config.host}:${config.port || 5432}/${config.database}?schema=public`;
      }
    }

    if (config.provider === 'mysql') {
      if (config.username && config.password && config.host && config.database) {
        return `mysql://${config.username}:${config.password}@${config.host}:${config.port || 3306}/${config.database}`;
      }
    }

    if (config.provider === 'sqlserver') {
      if (config.username && config.password && config.host && config.database) {
        return `sqlserver://${config.host}:${config.port || 1433};database=${config.database};user=${config.username};password=${config.password};encrypt=true`;
      }
    }

    return config.url || '';
  };

  const handleSave = () => {
    const connectionString = buildConnectionString();
    const fullConfig = {
      ...config,
      url: connectionString,
    };

    // Spara till localStorage
    localStorage.setItem('dbConfig', JSON.stringify(fullConfig));

    // Visa instruktioner för att uppdatera .env
    alert(
      `Konfiguration sparad!\n\n` +
      `Uppdatera din .env fil med:\n` +
      `DATABASE_URL="${connectionString}"\n\n` +
      `Och uppdatera prisma/schema.prisma:\n` +
      `provider = "${config.provider}"\n\n` +
      `Kör sedan: npm run db:migrate`
    );
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const connectionString = buildConnectionString();
      
      // Simulera test (i produktion skulle detta anropa en API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validera connection string
      if (!connectionString) {
        setTestResult({
          success: false,
          message: 'Vänligen fyll i alla obligatoriska fält',
        });
        return;
      }

      if (config.provider === 'sqlite') {
        setTestResult({
          success: true,
          message: 'SQLite-konfiguration ser korrekt ut',
        });
      } else {
        // För andra databaser, kontrollera att alla fält är ifyllda
        if (!config.host || !config.database || !config.username || !config.password) {
          setTestResult({
            success: false,
            message: 'Vänligen fyll i alla obligatoriska fält',
          });
          return;
        }

        setTestResult({
          success: true,
          message: `Connection string genererad. Testa anslutningen genom att köra: npm run db:migrate`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Fel: ${error instanceof Error ? error.message : 'Okänt fel'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const connectionString = buildConnectionString();

  return (
    <div className="database-settings">
      <div className="settings-header">
        <h3>Databaskonfiguration</h3>
        <p className="settings-description">
          Konfigurera databasanslutning. Ändringar kräver att du uppdaterar .env och kör migrations.
        </p>
      </div>

      <div className="database-form">
        <div className="form-group">
          <label htmlFor="provider">Databas-typ *</label>
          <select
            id="provider"
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value as DatabaseConfig['provider'])}
          >
            <option value="sqlite">SQLite (Utveckling)</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlserver">SQL Server / Azure SQL</option>
          </select>
        </div>

        {config.provider === 'sqlite' ? (
          <div className="form-group">
            <label htmlFor="sqlite-url">Sökväg *</label>
            <input
              id="sqlite-url"
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="file:./dev.db"
            />
            <small>Relativ sökväg från projektroten</small>
          </div>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="host">Värd (Host) *</label>
                <input
                  id="host"
                  type="text"
                  value={config.host || ''}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  placeholder={config.provider === 'sqlserver' ? 'server.database.windows.net' : 'localhost'}
                />
              </div>
              <div className="form-group">
                <label htmlFor="port">Port</label>
                <input
                  id="port"
                  type="number"
                  value={config.port || ''}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || undefined })}
                  placeholder={config.provider === 'postgresql' ? '5432' : config.provider === 'mysql' ? '3306' : '1433'}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="database">Databasnamn *</label>
              <input
                id="database"
                type="text"
                value={config.database || ''}
                onChange={(e) => setConfig({ ...config, database: e.target.value })}
                placeholder="launch_planner"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Användarnamn *</label>
                <input
                  id="username"
                  type="text"
                  value={config.username || ''}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  placeholder="postgres"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Lösenord *</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={config.password || ''}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Connection String (genererad)</label>
          <div className="connection-string-display">
            <code>{connectionString || 'Fyll i fälten ovan för att generera connection string'}</code>
            <button
              type="button"
              className="copy-button"
              onClick={() => {
                navigator.clipboard.writeText(connectionString);
                alert('Kopierat till urklipp!');
              }}
              disabled={!connectionString}
            >
              📋 Kopiera
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={handleTest}
            disabled={isTesting}
          >
            {isTesting ? 'Testar...' : 'Testa konfiguration'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleSave}
          >
            Spara konfiguration
          </button>
        </div>

        <div className="info-box">
          <strong>Nästa steg efter spara:</strong>
          <ol>
            <li>Kopiera connection string ovan</li>
            <li>Uppdatera <code>.env</code> med: <code>DATABASE_URL="..."</code></li>
            <li>Uppdatera <code>prisma/schema.prisma</code> provider till: <code>{config.provider}</code></li>
            <li>Kör: <code>npm run db:generate</code></li>
            <li>Kör: <code>npm run db:migrate</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
};

