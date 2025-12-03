import React, { useState, useEffect } from 'react';
import { GS1Debug } from './GS1Debug';
import './GS1Settings.css';

interface GS1Config {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  gln: string;
  apiUsername: string;
  apiPassword: string;
}

export const GS1Settings: React.FC = () => {
  const [config, setConfig] = useState<GS1Config>({
    enabled: false,
    clientId: '',
    clientSecret: '',
    subscriptionKey: '',
    gln: '',
    apiUsername: '',
    apiPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/gs1/config', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Behåll befintligt clientSecret om det är dolt
        setConfig(prevConfig => ({
          ...data,
          clientSecret: data.clientSecret === '***' ? prevConfig.clientSecret : data.clientSecret,
          apiPassword: data.apiPassword === '***' ? prevConfig.apiPassword : data.apiPassword,
        }));
      }
    } catch (error) {
      console.error('Fel vid laddning av GS1-konfiguration:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      // Om clientSecret eller apiPassword är "***", skicka inte med dem (behåll befintliga)
      const configToSave = { ...config };
      if (configToSave.clientSecret === '***') {
        delete configToSave.clientSecret;
      }
      if (configToSave.apiPassword === '***') {
        delete configToSave.apiPassword;
      }

      const response = await fetch('/api/gs1/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(configToSave),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        await loadConfig();
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte spara konfiguration');
      }
    } catch (error) {
      console.error('Fel vid sparande av GS1-konfiguration:', error);
      alert('Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/gs1/test', {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();
      setTestResult(result);
    } catch {
      setTestResult({
        success: false,
        message: 'Ett fel uppstod vid testning',
      });
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = config.clientId && config.clientSecret && config.subscriptionKey && config.gln && config.apiUsername && config.apiPassword;

  return (
    <div className="gs1-settings">
      <div className="gs1-settings-header">
        <div>
          <h3>GS1 Integration</h3>
          <p className="section-description">
            Konfigurera integration med GS1 Swedens API:er för att validera produktattribut och få notifikationer om ändringar.
          </p>
        </div>
        <div className="gs1-status">
          {config.enabled && isConfigured ? (
            <span className="badge success">Aktiverad</span>
          ) : (
            <span className="badge secondary">Ej aktiverad</span>
          )}
        </div>
      </div>

      <div className="gs1-config-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
            Aktivera GS1-integration
          </label>
          <small className="form-help">
            Aktivera för att använda GS1-validering och prenumerationer
          </small>
        </div>

        {config.enabled && (
          <>
            <div className="form-group">
              <label>Client ID *</label>
              <input
                type="text"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="GS1 Client ID"
              />
            </div>

            <div className="form-group">
              <label>Client Secret *</label>
              <input
                type="password"
                value={config.clientSecret}
                onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                placeholder="GS1 Client Secret"
              />
              <small className="form-help">
                Lösenordet döljs för säkerhet när det är sparat
              </small>
            </div>

            <div className="form-group">
              <label>Subscription Key *</label>
              <input
                type="text"
                value={config.subscriptionKey}
                onChange={(e) => setConfig({ ...config, subscriptionKey: e.target.value })}
                placeholder="GS1 Subscription Key"
              />
            </div>

            <div className="form-group">
              <label>GLN (Global Location Number) *</label>
              <input
                type="text"
                value={config.gln}
                onChange={(e) => setConfig({ ...config, gln: e.target.value })}
                placeholder="7350076480033"
              />
              <small className="form-help">
                Din organisations Global Location Number
              </small>
            </div>

            <div className="form-group">
              <label>API Username *</label>
              <input
                type="text"
                value={config.apiUsername}
                onChange={(e) => setConfig({ ...config, apiUsername: e.target.value })}
                placeholder="API user name från MyGS1"
              />
              <small className="form-help">
                API-användarnamnet från Technical Integration-sidan i MyGS1
              </small>
            </div>

            <div className="form-group">
              <label>API Password *</label>
              <input
                type="password"
                value={config.apiPassword}
                onChange={(e) => setConfig({ ...config, apiPassword: e.target.value })}
                placeholder="API user password"
              />
              <small className="form-help">
                API-användarens lösenord (skickas via SMS från GS1, syns inte i MyGS1)
              </small>
            </div>

            <div className="form-actions">
              <button
                className="secondary"
                onClick={handleTest}
                disabled={testing || !isConfigured}
              >
                {testing ? 'Testar...' : 'Testa anslutning'}
              </button>
              <button
                className="primary"
                onClick={handleSave}
                disabled={loading || !isConfigured}
              >
                {loading ? 'Sparar...' : saved ? 'Sparad!' : 'Spara konfiguration'}
              </button>
            </div>

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                <strong>{testResult.success ? '✓' : '✗'}</strong>
                <span>{testResult.message}</span>
              </div>
            )}
          </>
        )}
      </div>

      {!config.enabled && (
        <div className="gs1-info-box">
          <h4>För att aktivera GS1-integration behöver du:</h4>
          <ul>
            <li>Vara kund hos GS1 Sweden</li>
            <li>Ha ett API-konto med Client ID och Client Secret (från MyGS1 Technical Integration)</li>
            <li>Ha en Subscription Key från GS1 Developer Portal</li>
            <li>Ha en GLN (Global Location Number) för din organisation</li>
            <li>Ha API Username och API Password (password skickas via SMS från GS1)</li>
          </ul>
          <p>
            <a href="https://developer.gs1.se" target="_blank" rel="noopener noreferrer">
              Besök GS1 Developer Portal →
            </a>
          </p>
        </div>
      )}

      <GS1Debug />
    </div>
  );
};

