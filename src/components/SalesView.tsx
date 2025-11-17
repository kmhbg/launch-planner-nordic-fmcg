import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store';
import { formatWeekYear } from '../utils/timeline';
import { Product, RetailerLaunch } from '../types';
import './SalesView.css';

const AVAILABLE_RETAILERS = ['ICA', 'Axfood', 'Coop', 'Hemköp', 'Willys', 'Annat'];

export const SalesView: React.FC = () => {
  const { products, setSelectedProduct, setViewMode } = useStore();
  const [selectedRetailer, setSelectedRetailer] = useState<string>('all');

  // Filtrera produkter baserat på vald kedja
  const filteredProducts = useMemo(() => {
    if (selectedRetailer === 'all') {
      // Visa alla produkter med lansering, grupperade per kedja
      const productsByRetailer: Record<string, Product[]> = {};
      
      products
        .filter(p => p.productType === 'launch' && p.retailers && p.retailers.length > 0)
        .forEach(product => {
          product.retailers?.forEach((retailer: RetailerLaunch) => {
            if (!productsByRetailer[retailer.retailer]) {
              productsByRetailer[retailer.retailer] = [];
            }
            // Kontrollera att produkten inte redan finns i listan
            if (!productsByRetailer[retailer.retailer].some(p => p.id === product.id)) {
              productsByRetailer[retailer.retailer].push(product);
            }
          });
        });
      
      // Sortera produkter per kedja efter tidigaste lanseringsvecka
      Object.keys(productsByRetailer).forEach(retailer => {
        productsByRetailer[retailer].sort((a, b) => {
          const aWeeks = a.retailers?.find(r => r.retailer === retailer)?.launchWeeks || [];
          const bWeeks = b.retailers?.find(r => r.retailer === retailer)?.launchWeeks || [];
          const aEarliest = aWeeks.length > 0 ? Math.min(...aWeeks) : 999;
          const bEarliest = bWeeks.length > 0 ? Math.min(...bWeeks) : 999;
          return aEarliest - bEarliest;
        });
      });
      
      return productsByRetailer;
    } else {
      // Visa endast produkter för vald kedja
      const retailerProducts = products
        .filter(p => 
          p.productType === 'launch' && 
          p.retailers && 
          p.retailers.some(r => r.retailer === selectedRetailer)
        )
        .sort((a, b) => {
          // Sortera efter tidigaste lanseringsvecka för denna kedja
          const aWeeks = a.retailers?.find(r => r.retailer === selectedRetailer)?.launchWeeks || [];
          const bWeeks = b.retailers?.find(r => r.retailer === selectedRetailer)?.launchWeeks || [];
          const aEarliest = aWeeks.length > 0 ? Math.min(...aWeeks) : 999;
          const bEarliest = bWeeks.length > 0 ? Math.min(...bWeeks) : 999;
          return aEarliest - bEarliest;
        });
      
      return { [selectedRetailer]: retailerProducts };
    }
  }, [products, selectedRetailer]);

  const handleProductClick = (productId: string) => {
    setSelectedProduct(productId);
    setViewMode('product');
  };

  const getRetailerWeeks = (product: Product, retailer: string): number[] => {
    const retailerLaunch = product.retailers?.find(r => r.retailer === retailer);
    return retailerLaunch?.launchWeeks || [];
  };

  const getRetailerYear = (product: Product, retailer: string): number => {
    const retailerLaunch = product.retailers?.find(r => r.retailer === retailer);
    return retailerLaunch?.launchYear || product.launchYear;
  };

  const getStatusColor = (status: Product['status']) => {
    switch (status) {
      case 'completed':
        return 'var(--color-success)';
      case 'active':
        return 'var(--color-info)';
      case 'cancelled':
        return 'var(--color-danger)';
      default:
        return 'var(--color-text-tertiary)';
    }
  };

  const getStatusLabel = (status: Product['status']) => {
    switch (status) {
      case 'completed':
        return 'Klart';
      case 'active':
        return 'Aktiv';
      case 'cancelled':
        return 'Inställd';
      default:
        return 'Utkast';
    }
  };

  return (
    <div className="sales-view">
      <div className="sales-header">
        <h1>Säljöversikt</h1>
        <p className="sales-subtitle">
          Översikt över produkter per kedja och deras lanseringsveckor
        </p>
      </div>

      <div className="sales-filters">
        <div className="filter-group">
          <label htmlFor="retailer-filter">Filtrera på kedja:</label>
          <select
            id="retailer-filter"
            value={selectedRetailer}
            onChange={(e) => setSelectedRetailer(e.target.value)}
            className="retailer-filter-select"
          >
            <option value="all">Alla kedjor</option>
            {AVAILABLE_RETAILERS.map(retailer => (
              <option key={retailer} value={retailer}>
                {retailer}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sales-content">
        {Object.keys(filteredProducts).length === 0 ? (
          <div className="empty-state">
            <p>Inga produkter hittades för vald kedja.</p>
          </div>
        ) : (
          Object.entries(filteredProducts).map(([retailer, retailerProducts]) => (
            <div key={retailer} className="retailer-section">
              <div className="retailer-header">
                <h2>{retailer}</h2>
                <span className="product-count">
                  {retailerProducts.length} {retailerProducts.length === 1 ? 'produkt' : 'produkter'}
                </span>
              </div>

              <div className="products-grid">
                {retailerProducts.map((product) => {
                  const weeks = getRetailerWeeks(product, retailer);
                  const year = getRetailerYear(product, retailer);
                  const completedCount = product.activities.filter(a => a.status === 'completed').length;
                  const totalCount = product.activities.length;
                  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                  return (
                    <div
                      key={product.id}
                      className="sales-product-card"
                      onClick={() => handleProductClick(product.id)}
                    >
                      <div className="sales-product-header">
                        <h3 className="sales-product-name">{product.name}</h3>
                        <span
                          className="sales-status-badge"
                          style={{
                            backgroundColor: getStatusColor(product.status) + '20',
                            color: getStatusColor(product.status),
                            border: `1px solid ${getStatusColor(product.status)}`,
                          }}
                        >
                          {getStatusLabel(product.status)}
                        </span>
                      </div>

                      <div className="sales-product-info">
                        <div className="info-item">
                          <span className="info-label">GTIN:</span>
                          <span className="info-value">{product.gtin}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Lanseringsveckor:</span>
                          <span className="info-value">
                            {weeks.sort((a, b) => a - b).map(w => `V${w}`).join(', ')} {year}
                          </span>
                        </div>
                        {product.category && (
                          <div className="info-item">
                            <span className="info-label">Kategori:</span>
                            <span className="info-value">{product.category}</span>
                          </div>
                        )}
                      </div>

                      <div className="sales-product-progress">
                        <div className="progress-header">
                          <span className="progress-text">
                            {completedCount} / {totalCount} aktiviteter
                          </span>
                          <span className="progress-percentage">{Math.round(progress)}%</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

