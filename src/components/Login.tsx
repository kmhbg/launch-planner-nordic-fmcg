import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import './Login.css';

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState('local');
  const [availableMethods, setAvailableMethods] = useState<Array<{ id: string; name: string; enabled: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Hämta tillgängliga inloggningsmetoder
    fetch('/api/auth/methods')
      .then(res => res.json())
      .then(data => {
        setAvailableMethods(data.methods || []);
      })
      .catch(err => {
        console.error('Fel vid hämtning av inloggningsmetoder:', err);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password, authMethod);
    } catch (err: any) {
      setError(err.message || 'Inloggning misslyckades');
    } finally {
      setLoading(false);
    }
  };

  // Om användaren redan är inloggad, visa inget
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Launch Planner</h1>
          <p>Produktlanseringsplanerare</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-method">Inloggningsmetod</label>
            <select
              id="auth-method"
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value)}
              className="form-control"
            >
              {availableMethods
                .filter(m => m.enabled)
                .map(method => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="username">Användarnamn</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Användarnamn"
              required
              autoFocus
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Lösenord</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Lösenord"
              required
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isLoading}
            className="login-button primary"
          >
            {loading || isLoading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-hint">
            <strong>Första gången?</strong><br />
            Användarnamn: <code>admin</code><br />
            Lösenord: <code>admin</code>
          </p>
        </div>
      </div>
    </div>
  );
};

