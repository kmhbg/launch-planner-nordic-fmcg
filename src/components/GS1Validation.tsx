import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { Product } from '../types';
import './GS1Validation.css';

interface TradeItem {
  gtin?: string;
  [key: string]: unknown;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingAttributes: string[];
  tradeItem?: TradeItem;
}

export const GS1Validation: React.FC = () => {
  const { products } = useStore();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [gs1Enabled, setGs1Enabled] = useState(false);

  useEffect(() => {
    checkGS1Enabled();
  }, []);

  const checkGS1Enabled = async () => {
    try {
      const response = await fetch('/api/gs1/config', {
        credentials: 'include',
      });
      if (response.ok) {
        const config = await response.json();
        const enabled = config.enabled && config.clientId && config.subscriptionKey && config.gln;
        setGs1Enabled(enabled);
        return enabled;
      }
      return false;
    } catch (error) {
      console.error('Fel vid kontroll av GS1-status:', error);
      return false;
    }
  };

  const handleValidate = async () => {
    if (!selectedProductId) {
      alert('Välj en produkt att validera');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      alert('Produkt hittades inte');
      return;
    }

    setLoading(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/gs1/validate-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ gtin: product.gtin }),
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
      } else {
        const error = await response.json();
        alert(error.error || 'Validering misslyckades');
      }
    } catch (error) {
      console.error('Fel vid validering:', error);
      alert('Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  const validateAllProducts = async () => {
    if (!confirm(`Vill du validera alla ${products.length} produkter? Detta kan ta en stund.`)) {
      return;
    }

    setLoading(true);
    const results: Array<{ product: Product; result: ValidationResult }> = [];

    for (const product of products) {
      try {
        const response = await fetch('/api/gs1/validate-product', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ gtin: product.gtin }),
        });

        if (response.ok) {
          const result = await response.json();
          results.push({ product, result });
        }
      } catch (error) {
        console.error(`Fel vid validering av ${product.name}:`, error);
      }
    }

    setLoading(false);
    
    // Visa sammanfattning
    const invalid = results.filter(r => !r.result.valid);
    const withWarnings = results.filter(r => r.result.warnings.length > 0);
    
    alert(
      `Validering klar!\n\n` +
      `Totalt: ${results.length} produkter\n` +
      `Ogiltiga: ${invalid.length}\n` +
      `Med varningar: ${withWarnings.length}`
    );
  };

  if (!gs1Enabled) {
    return (
      <div className="gs1-validation-disabled">
        <h3>GS1-validering</h3>
        <p>GS1-integration är inte aktiverad. Aktivera den i inställningarna för att använda produktvalidering.</p>
      </div>
    );
  }

  return (
    <div className="gs1-validation">
      <div className="gs1-validation-header">
        <div>
          <h3>Produktvalidering mot GS1</h3>
          <p className="section-description">
            Validera produktattribut mot GS1-regler för att säkerställa att alla nödvändiga fält är ifyllda.
          </p>
        </div>
        <div className="validation-actions">
          <button
            className="secondary"
            onClick={validateAllProducts}
            disabled={loading || products.length === 0}
          >
            Validera alla produkter
          </button>
        </div>
      </div>

      <div className="validation-form">
        <div className="form-group">
          <label>Välj produkt att validera</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Välj produkt --</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.gtin})
              </option>
            ))}
          </select>
        </div>

        <button
          className="primary"
          onClick={handleValidate}
          disabled={loading || !selectedProductId}
        >
          {loading ? 'Validerar...' : 'Validera produkt'}
        </button>
      </div>

      {validationResult && (
        <div className="validation-results">
          <div className={`validation-status ${validationResult.valid ? 'valid' : 'invalid'}`}>
            <h4>
              {validationResult.valid ? '✓ Produkten är giltig' : '✗ Produkten är ogiltig'}
            </h4>
          </div>

          {validationResult.errors.length > 0 && (
            <div className="validation-section errors">
              <h5>Fel ({validationResult.errors.length})</h5>
              <ul>
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.missingAttributes.length > 0 && (
            <div className="validation-section missing">
              <h5>Saknade attribut ({validationResult.missingAttributes.length})</h5>
              <ul>
                {validationResult.missingAttributes.map((attr, index) => (
                  <li key={index}>{attr}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="validation-section warnings">
              <h5>Varningar ({validationResult.warnings.length})</h5>
              <ul>
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.valid && validationResult.errors.length === 0 && (
            <div className="validation-success">
              <p>✓ Alla kritiska attribut är ifyllda och produkten uppfyller GS1-regler.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

