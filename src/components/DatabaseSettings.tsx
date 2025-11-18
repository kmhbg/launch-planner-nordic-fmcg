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
    // Ladda konfiguration från API
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/database/config');
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.provider && result.url) {
          // Parse connection string för att fylla i formuläret
          if (result.provider === 'sqlite') {
            setConfig({
              provider: 'sqlite',
              url: result.url,
            });
          } else {
            // För andra databaser, försök parse connection string
            const url = new URL(result.url.replace(/^([^:]+):/, 'http:'));
            setConfig({
              provider: result.provider,
              url: result.url,
              host: url.hostname,
              port: parseInt(url.port) || undefined,
              database: url.pathname.replace('/', ''),
              username: url.username || '',
              password: url.password || '',
            });
          }
        } else {
          // Fallback till localStorage
          const saved = localStorage.getItem('dbConfig');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setConfig(parsed);
            } catch (e) {
              console.error('Failed to load saved config', e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load config from API', error);
        // Fallback till localStorage om API inte är tillgängligt
        const saved = localStorage.getItem('dbConfig');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setConfig(parsed);
          } catch (e) {
            console.error('Failed to load saved config', e);
          }
        }
        // Visa varning om backend inte körs
        if (error instanceof TypeError && error.message.includes('fetch')) {
          setTestResult({
            success: false,
            message: 'Backend-servern körs inte. Starta med: npm run server eller npm run dev:full',
          });
        }
      }
    };

    loadConfig();
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

  const handleSave = async () => {
    const connectionString = buildConnectionString();
    
    if (!connectionString) {
      alert('Vänligen fyll i alla obligatoriska fält');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/database/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionString,
          provider: config.provider,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text || response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: result.message || 'Databas konfigurerad och migrations körda automatiskt!',
        });
        
        // Spara till localStorage
        localStorage.setItem('dbConfig', JSON.stringify({
          ...config,
          url: connectionString,
        }));

        // Reload sidan för att ladda ny konfiguration
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setTestResult({
          success: false,
          message: result.message || 'Fel vid konfiguration',
        });
      }
    } catch (error) {
      let errorMessage = 'Okänt fel';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Kunde inte ansluta till server. Kontrollera att backend körs (npm run server eller npm run dev:full)';
      } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
        errorMessage = 'Server returnerade ogiltigt svar. Kontrollera att backend-servern körs på port 3001.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setTestResult({
        success: false,
        message: `Fel: ${errorMessage}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const connectionString = buildConnectionString();
      
      if (!connectionString) {
        setTestResult({
          success: false,
          message: 'Vänligen fyll i alla obligatoriska fält',
        });
        setIsTesting(false);
        return;
      }

      if (config.provider !== 'sqlite') {
        if (!config.host || !config.database || !config.username || !config.password) {
          setTestResult({
            success: false,
            message: 'Vänligen fyll i alla obligatoriska fält',
          });
          setIsTesting(false);
          return;
        }
      }

      // Testa via API
      const response = await fetch('/api/database/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionString,
          provider: config.provider,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text || response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: result.message || 'Anslutning testad och Prisma Client genererad!',
        });
      } else {
        setTestResult({
          success: false,
          message: result.message || 'Test misslyckades',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Fel: ${error instanceof Error ? error.message : 'Kunde inte ansluta till server. Kontrollera att backend körs (npm run server)'}`,
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
          Konfigurera databasanslutning. Systemet hanterar allt automatiskt - inga .env-filer eller kommandon behövs!
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
            disabled={isTesting}
          >
            {isTesting ? 'Sparar och konfigurerar...' : 'Spara och konfigurera automatiskt'}
          </button>
        </div>

        <div className="info-box">
          <strong>✨ Automatisk konfiguration</strong>
          <p style={{ marginTop: 'var(--spacing-xs)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            När du klickar på "Spara och konfigurera automatiskt" kommer systemet automatiskt att:
          </p>
          <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            <li>Uppdatera .env filen</li>
            <li>Uppdatera Prisma schema</li>
            <li>Generera Prisma Client</li>
            <li>Köra migrations</li>
          </ul>
          <div style={{ 
            marginTop: 'var(--spacing-sm)', 
            padding: 'var(--spacing-sm)', 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)', 
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)'
          }}>
            <strong>📌 Viktigt:</strong> Backend-servern måste köras för att detta ska fungera.
            <br />
            <code style={{ 
              display: 'block', 
              marginTop: 'var(--spacing-xs)', 
              padding: 'var(--spacing-xs)', 
              background: 'var(--color-bg-primary)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace'
            }}>
              npm run dev:full
            </code>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              (Detta startar både frontend och backend automatiskt)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

