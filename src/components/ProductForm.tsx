import React, { useState } from 'react';
import { useStore } from '../store/store';
import { getWeek, getYear } from 'date-fns';
import { getLaunchDate } from '../utils/timeline';
import { validateEAN13, formatGTIN } from '../utils/validation';
import { RetailerLaunch } from '../types';
import './ProductForm.css';

interface ProductFormProps {
  onClose: () => void;
  onSave: () => void;
}

const AVAILABLE_RETAILERS = ['ICA', 'Axfood', 'Coop', 'Hemköp', 'Willys', 'Annat'];

export const ProductForm: React.FC<ProductFormProps> = ({ onClose, onSave }) => {
  const { addProduct, currentUser } = useStore();
  const [formData, setFormData] = useState({
    gtin: '',
    name: '',
    productType: 'launch' as 'launch' | 'delisting',
    launchYear: getYear(new Date()),
    launchWeek: getWeek(new Date()),
    category: '',
    retailers: [] as Array<{ retailer: string; weeks: number[] }>,
  });
  const [gtinError, setGtinError] = useState<string>('');
  const [selectedRetailer, setSelectedRetailer] = useState('');
  const [retailerWeeks, setRetailerWeeks] = useState('');

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
      retailers: [...formData.retailers, { retailer: selectedRetailer, weeks }],
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

    // För delisting behöver vi inte retailers
    if (formData.productType === 'launch' && formData.retailers.length === 0) {
      alert('Välj minst en kedja med lanseringsveckor');
      return;
    }

    let earliestWeek = formData.launchWeek;
    let earliestYear = formData.launchYear;
    let retailers: RetailerLaunch[] = [];
    
    if (formData.productType === 'launch') {
      // Hitta tidigaste veckan från alla retailers
      earliestWeek = 53;
      
      formData.retailers.forEach(r => {
        r.weeks.forEach(week => {
          if (week < earliestWeek) {
            earliestWeek = week;
            earliestYear = formData.launchYear;
          }
        });
      });
      
      // Konvertera retailers till RetailerLaunch format
      retailers = formData.retailers.map(r => ({
        retailer: r.retailer,
        launchWeeks: r.weeks,
        launchYear: formData.launchYear,
      }));
    }

    const launchDate = getLaunchDate(earliestYear, earliestWeek);
    
    addProduct({
      gtin: formData.gtin,
      name: formData.name,
      productType: formData.productType,
      launchWeek: earliestWeek,
      launchYear: earliestYear,
      launchDate,
      retailers: retailers.length > 0 ? retailers : undefined,
      category: formData.category || undefined,
      status: 'draft',
      createdBy: currentUser?.id || 'unknown',
      delistingRequestedBy: formData.productType === 'delisting' ? currentUser?.id : undefined,
    });

    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ny produktlansering</h2>
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

          <div className="form-group">
            <label>Typ av process *</label>
            <select
              value={formData.productType}
              onChange={(e) => setFormData({ 
                ...formData, 
                productType: e.target.value as 'launch' | 'delisting',
                retailers: e.target.value === 'delisting' ? [] : formData.retailers,
              })}
            >
              <option value="launch">Lansering</option>
              <option value="delisting">Delisting (Validoo)</option>
            </select>
            <small style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
              {formData.productType === 'delisting' 
                ? 'Delisting-process för att ta bort produkt via Validoo' 
                : 'Standard produktlanseringsprocess'}
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="launchYear">
                {formData.productType === 'delisting' ? 'Delistingsår' : 'Lanseringsår'}
              </label>
              <input
                id="launchYear"
                type="number"
                value={formData.launchYear}
                onChange={(e) => setFormData({ ...formData, launchYear: parseInt(e.target.value) })}
                min={getYear(new Date())}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="launchWeek">
                {formData.productType === 'delisting' ? 'Delistingsvecka' : 'Lanseringsvecka'}
              </label>
              <input
                id="launchWeek"
                type="number"
                value={formData.launchWeek}
                onChange={(e) => setFormData({ ...formData, launchWeek: parseInt(e.target.value) })}
                min={1}
                max={53}
                required
              />
            </div>
          </div>

          {formData.productType === 'launch' && (
          <div className="form-group">
            <label>Kedjor och lanseringsveckor *</label>
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
                    <span><strong>{r.retailer}</strong>: V{r.weeks.sort((a, b) => a - b).join(', V')}</span>
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

          {formData.productType === 'delisting' && (
            <div className="form-group">
              <div className="info-box">
                <strong>Delisting-process</strong>
                <p>Denna produkt kommer att följa delisting-processen via Validoo. Processen inkluderar:</p>
                <ul>
                  <li>Avisering till Validoo</li>
                  <li>Uppdatering av produktdata</li>
                  <li>Avisering till kedjor</li>
                  <li>Lagersaldo-kontroll</li>
                  <li>Finalisering i Validoo</li>
                </ul>
                <p style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Ansvarig: {currentUser?.name || 'Produktchef'}
                </p>
              </div>
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
              Skapa produkt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

