import React, { useState, useEffect } from 'react';
import './AuthSettings.css';

interface AuthMethod {
  id: string;
  name: string;
  enabled: boolean;
}

interface AuthConfig {
  enabled?: boolean;
  azure?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
  };
  ldap?: {
    url: string;
    baseDN: string;
    username: string;
    password: string;
  };
  ad?: {
    url: string;
    baseDN: string;
    username: string;
    password: string;
  };
}

export const AuthSettings: React.FC = () => {
  const [methods, setMethods] = useState<AuthMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('local');
  const [config, setConfig] = useState<AuthConfig>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMethods();
    loadConfig();
  }, []);

  const loadMethods = async () => {
    try {
      const response = await fetch('/api/auth/methods');
      const data = await response.json();
      setMethods(data.methods || []);
    } catch (error) {
      console.error('Fel vid hämtning av inloggningsmetoder:', error);
    }
  };

  const loadConfig = async () => {
    if (selectedMethod === 'local') {
      setConfig({ enabled: true });
      return;
    }

    try {
      const response = await fetch('/api/auth/config?method=' + selectedMethod, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const methodConfig = data.config || {};
        
        // Strukturera konfigurationen korrekt baserat på metod
        const structuredConfig: AuthConfig = {
          enabled: methodConfig.enabled || false,
        };

        if (selectedMethod === 'azure') {
          structuredConfig.azure = {
            tenantId: methodConfig.tenantId || '',
            clientId: methodConfig.clientId || '',
            clientSecret: methodConfig.clientSecret || '',
          };
        } else if (selectedMethod === 'ldap') {
          structuredConfig.ldap = {
            url: methodConfig.url || '',
            baseDN: methodConfig.baseDN || '',
            username: methodConfig.username || '',
            password: methodConfig.password || '',
          };
        } else if (selectedMethod === 'ad') {
          structuredConfig.ad = {
            url: methodConfig.url || '',
            baseDN: methodConfig.baseDN || '',
            username: methodConfig.username || '',
            password: methodConfig.password || '',
          };
        }

        setConfig(structuredConfig);
      } else {
        setConfig({ enabled: false });
      }
    } catch (error) {
      console.error('Fel vid hämtning av konfiguration:', error);
      setConfig({ enabled: false });
    }
  };

  useEffect(() => {
    loadConfig();
  }, [selectedMethod]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Strukturera konfigurationen korrekt för backend
      const configToSave: any = {
        enabled: config.enabled !== false, // Default till true om inte explicit satt till false
      };

      // Lägg till metod-specifik konfiguration
      if (selectedMethod === 'azure') {
        configToSave.azure = config.azure || {};
      } else if (selectedMethod === 'ldap') {
        configToSave.ldap = config.ldap || {};
      } else if (selectedMethod === 'ad') {
        configToSave.ad = config.ad || {};
      }

      const response = await fetch('/api/auth/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ method: selectedMethod, config: configToSave }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Konfiguration sparad!' });
        // Uppdatera metoder för att visa ny status
        await loadMethods();
        // Ladda om konfigurationen för att visa uppdaterade värden
        await loadConfig();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Kunde inte spara konfiguration' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ett fel uppstod' });
    } finally {
      setSaving(false);
    }
  };

  const renderConfigForm = () => {
    switch (selectedMethod) {
      case 'azure':
        return (
          <div className="auth-config-form">
            <h4>Azure AD SSO Konfiguration</h4>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.enabled !== false}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
                {' '}Aktivera Azure AD SSO
              </label>
            </div>
            <div className="form-group">
              <label>Tenant ID</label>
              <input
                type="text"
                value={config.azure?.tenantId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  azure: { ...config.azure, tenantId: e.target.value },
                })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div className="form-group">
              <label>Client ID</label>
              <input
                type="text"
                value={config.azure?.clientId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  azure: { ...config.azure, clientId: e.target.value },
                })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div className="form-group">
              <label>Client Secret</label>
              <input
                type="password"
                value={config.azure?.clientSecret || ''}
                onChange={(e) => setConfig({
                  ...config,
                  azure: { ...config.azure, clientSecret: e.target.value },
                })}
                placeholder="Ditt client secret"
              />
            </div>
            <p className="config-hint">
              För att aktivera Azure AD SSO behöver du registrera applikationen i Azure Portal
              och konfigurera OAuth2-flödet. Notera att Azure AD SSO kräver ytterligare frontend-implementation
              för OAuth2 redirect-flödet.
            </p>
          </div>
        );

      case 'ldap':
        return (
          <div className="auth-config-form">
            <h4>LDAP Konfiguration</h4>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.enabled !== false}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
                {' '}Aktivera LDAP-inloggning
              </label>
            </div>
            <div className="form-group">
              <label>LDAP URL</label>
              <input
                type="text"
                value={config.ldap?.url || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ldap: { ...config.ldap || {}, url: e.target.value },
                })}
                placeholder="ldap://ldap.example.com:389"
              />
            </div>
            <div className="form-group">
              <label>Base DN</label>
              <input
                type="text"
                value={config.ldap?.baseDN || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ldap: { ...config.ldap || {}, baseDN: e.target.value },
                })}
                placeholder="dc=example,dc=com"
              />
            </div>
            <div className="form-group">
              <label>Bind DN (för sökning)</label>
              <input
                type="text"
                value={config.ldap?.username || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ldap: { ...config.ldap || {}, username: e.target.value },
                })}
                placeholder="cn=admin,dc=example,dc=com"
              />
            </div>
            <div className="form-group">
              <label>Bind Password</label>
              <input
                type="password"
                value={config.ldap?.password || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ldap: { ...config.ldap || {}, password: e.target.value },
                })}
                placeholder="Lösenord för bind DN"
              />
            </div>
          </div>
        );

      case 'ad':
        return (
          <div className="auth-config-form">
            <h4>Active Directory Konfiguration</h4>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.enabled !== false}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
                {' '}Aktivera Active Directory-inloggning
              </label>
            </div>
            <div className="form-group">
              <label>AD URL</label>
              <input
                type="text"
                value={config.ad?.url || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ad: { ...config.ad || {}, url: e.target.value },
                })}
                placeholder="ldap://ad.example.com:389"
              />
            </div>
            <div className="form-group">
              <label>Base DN</label>
              <input
                type="text"
                value={config.ad?.baseDN || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ad: { ...config.ad || {}, baseDN: e.target.value },
                })}
                placeholder="dc=example,dc=com"
              />
            </div>
            <div className="form-group">
              <label>Service Account DN</label>
              <input
                type="text"
                value={config.ad?.username || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ad: { ...config.ad || {}, username: e.target.value },
                })}
                placeholder="CN=ServiceAccount,CN=Users,DC=example,DC=com"
              />
            </div>
            <div className="form-group">
              <label>Service Account Password</label>
              <input
                type="password"
                value={config.ad?.password || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ad: { ...config.ad || {}, password: e.target.value },
                })}
                placeholder="Lösenord för service account"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="auth-config-form">
            <p>Lokal inloggning kräver ingen konfiguration.</p>
            <p>Admin-användaren skapas automatiskt vid första start:</p>
            <ul>
              <li>Användarnamn: <code>admin</code></li>
              <li>Lösenord: <code>admin</code></li>
            </ul>
          </div>
        );
    }
  };

  return (
    <div className="auth-settings">
      <div className="auth-settings-header">
        <h3>Inloggningsinställningar</h3>
        <p className="section-description">
          Konfigurera olika inloggningsmetoder för applikationen.
        </p>
      </div>

      <div className="auth-methods-list">
        <h4>Tillgängliga metoder</h4>
        <div className="methods-grid">
          {methods.map((method) => (
            <div
              key={method.id}
              className={`method-card ${selectedMethod === method.id ? 'selected' : ''} ${method.id !== 'local' && !method.enabled ? 'disabled' : ''}`}
              onClick={() => setSelectedMethod(method.id)}
            >
              <div className="method-header">
                <h5>{method.name}</h5>
                {method.id === 'local' ? (
                  <span className="badge success">Aktiverad</span>
                ) : method.enabled ? (
                  <span className="badge success">Konfigurerad</span>
                ) : (
                  <span className="badge warning">Ej konfigurerad</span>
                )}
              </div>
              {method.id === 'local' && (
                <p className="method-description">
                  Standard inloggning med användarnamn och lösenord.
                </p>
              )}
              {method.id === 'azure' && (
                <p className="method-description">
                  Single Sign-On med Microsoft Azure Active Directory.
                </p>
              )}
              {method.id === 'ldap' && (
                <p className="method-description">
                  Inloggning via LDAP-server.
                </p>
              )}
              {method.id === 'ad' && (
                <p className="method-description">
                  Inloggning via Active Directory.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-config-section">
        {renderConfigForm()}
        {selectedMethod !== 'local' && (
          <div className="config-actions">
            <button
              className="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Sparar...' : 'Spara konfiguration'}
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

