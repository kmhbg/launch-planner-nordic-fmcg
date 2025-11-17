import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { Product, RetailerLaunch } from '../types';
import { getWeek, getYear } from 'date-fns';
import { getLaunchDate } from '../utils/timeline';
import { validateEAN13, formatGTIN } from '../utils/validation';
import './ProductForm.css';

interface EditProductFormProps {
  product: Product;
  onClose: () => void;
  onSave: () => void;
}

const AVAILABLE_RETAILERS = ['ICA', 'Axfood', 'Coop', 'Hemköp', 'Willys', 'Annat'];

export const EditProductForm: React.FC<EditProductFormProps> = ({ product, onClose, onSave }) => {
  const { updateProduct } = useStore();
  const [formData, setFormData] = useState({
    gtin: product.gtin,
    name: product.name,
    category: product.category || '',
    retailers: (product.retailers || []).map(r => ({
      retailer: r.retailer,
      launchWeeks: [...r.launchWeeks],
      launchYear: r.launchYear,
    })),
  });
  const [gtinError, setGtinError] = useState<string>('');
  const [selectedRetailer, setSelectedRetailer] = useState('');
  const [retailerWeeks, setRetailerWeeks] = useState('');

  useEffect(() => {
    // Validera GTIN när komponenten laddas
    if (formData.gtin) {
      const validation = validateEAN13(formData.gtin);
      if (!validation.valid) {
        setGtinError(validation.error || 'Ogiltig EAN-13');
      }
    }
  }, []);

  const handleGtinChange = (value: string) => {
    setFormData({ ...formData, gtin: value });
    if (value) {
      const validation = validateEAN13(value);
      if (!validation.valid) {
        setGtinError(validation.error || 'Ogiltig EAN-13');
      } else {
        setGtinError('');
      }
    } else {
      setGtinError('');
    }
  };

  const addRetailer = () => {
    if (!selectedRetailer) return;
    
    const weeks = retailerWeeks
      .split(',')
      .map(w => parseInt(w.trim()))
      .filter(w => !isNaN(w) && w >= 1 && w <= 53);
    
    if (weeks.length === 0) {
      alert('Ange minst en giltig vecka (1-53)');
      return;
    }

    if (formData.retailers.some(r => r.retailer === selectedRetailer)) {
      alert('Denna kedja är redan tillagd');
      return;
    }

    setFormData({
      ...formData,
      retailers: [...formData.retailers, { 
        retailer: selectedRetailer, 
        launchWeeks: weeks,
        launchYear: product.launchYear,
      }],
    });
    setSelectedRetailer('');
    setRetailerWeeks('');
  };

  const removeRetailer = (retailer: string) => {
    setFormData({
      ...formData,
      retailers: formData.retailers.filter(r => r.retailer !== retailer),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.gtin || !formData.name) {
      alert('GTIN och produktnamn är obligatoriska');
      return;
    }

    const validation = validateEAN13(formData.gtin);
    if (!validation.valid) {
      alert(validation.error || 'Ogiltig EAN-13');
      return;
    }

    // Beräkna tidigaste veckan från alla retailers (endast för launch)
    let earliestWeek = product.launchWeek;
    let earliestYear = product.launchYear;

    if (product.productType === 'launch' && formData.retailers.length > 0) {
      earliestWeek = 53;
      formData.retailers.forEach(r => {
        r.launchWeeks.forEach(week => {
          if (week < earliestWeek) {
            earliestWeek = week;
            earliestYear = r.launchYear;
          }
        });
      });
    }

    const launchDate = getLaunchDate(earliestYear, earliestWeek);

    // Uppdatera produkt
    updateProduct(product.id, {
      gtin: formData.gtin,
      name: formData.name,
      category: formData.category || undefined,
      retailers: product.productType === 'launch' ? formData.retailers : product.retailers,
      launchWeek: earliestWeek,
      launchYear: earliestYear,
      launchDate,
    });

    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Redigera produkt</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-group">
            <label htmlFor="gtin">GTIN (EAN-13) *</label>
            <input
              id="gtin"
              type="text"
              value={formData.gtin}
              onChange={(e) => handleGtinChange(e.target.value)}
              placeholder="7310865000000"
              maxLength={13}
              required
            />
            {gtinError && <span className="error-message">{gtinError}</span>}
            {formData.gtin && !gtinError && (
              <span className="success-message">✓ Formaterad: {formatGTIN(formData.gtin)}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="name">Produktnamn *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Ekologisk Havregryn 500g"
              required
            />
          </div>

          {product.productType === 'launch' && (
            <div className="form-group">
              <label>Kedjor och lanseringsveckor</label>
              <div className="retailer-input-group">
                <select
                  value={selectedRetailer}
                  onChange={(e) => setSelectedRetailer(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Välj kedja</option>
                  {AVAILABLE_RETAILERS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={retailerWeeks}
                  onChange={(e) => setRetailerWeeks(e.target.value)}
                  placeholder="Veckor (t.ex. 3,5,8)"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addRetailer} className="primary">
                  Lägg till
                </button>
              </div>
              <small style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                Ange veckor separerade med komma (t.ex. 3,5,8)
              </small>

              {formData.retailers.length > 0 && (
                <div className="retailers-list">
                  {formData.retailers.map((r, idx) => (
                    <div key={idx} className="retailer-tag">
                      <span><strong>{r.retailer}</strong>: V{r.launchWeeks.sort((a, b) => a - b).join(', V')}</span>
                      <button
                        type="button"
                        onClick={() => removeRetailer(r.retailer)}
                        className="remove-retailer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="category">Kategori (valfritt)</label>
            <input
              id="category"
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Ex: Drycker, Snacks, etc."
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose}>
              Avbryt
            </button>
            <button type="submit" className="primary">
              Spara ändringar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

