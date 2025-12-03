import React, { useState } from 'react';

/**
 * Debug-komponent för att testa GS1-integration
 * Visar detaljerad information om fel och konfiguration
 */
export const GS1Debug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    setDebugInfo(null);

    const info: any = {
      timestamp: new Date().toISOString(),
      config: null,
      testConnection: null,
      errors: [],
    };

    try {
      // Test 1: Ladda konfiguration
      try {
        const configResponse = await fetch('/api/gs1/config', {
          credentials: 'include',
        });
        if (configResponse.ok) {
          info.config = await configResponse.json();
        } else {
          info.errors.push(`Kunde inte ladda konfiguration: ${configResponse.status}`);
        }
      } catch (error: any) {
        info.errors.push(`Fel vid laddning av konfiguration: ${error.message}`);
      }

      // Test 2: Testa anslutning
      if (info.config && info.config.enabled) {
        try {
          const testResponse = await fetch('/api/gs1/test', {
            method: 'POST',
            credentials: 'include',
          });
          if (testResponse.ok) {
            info.testConnection = await testResponse.json();
          } else {
            const errorData = await testResponse.json().catch(() => ({ error: 'Okänt fel' }));
            info.errors.push(`Test misslyckades: ${testResponse.status} - ${JSON.stringify(errorData)}`);
          }
        } catch (error: any) {
          info.errors.push(`Fel vid testning: ${error.message}`);
        }
      }

      setDebugInfo(info);
    } catch (error: any) {
      info.errors.push(`Allmänt fel: ${error.message}`);
      setDebugInfo(info);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', marginTop: '20px' }}>
      <h4>GS1 Debug Information</h4>
      <button onClick={runDebug} disabled={loading} style={{ marginBottom: '20px' }}>
        {loading ? 'Kör debug...' : 'Kör debug'}
      </button>

      {debugInfo && (
        <div style={{ background: 'white', padding: '15px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
          <h5>Debug Resultat:</h5>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

