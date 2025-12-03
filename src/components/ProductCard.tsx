import React from 'react';
import { Product } from '../types';
import { formatWeekYear } from '../utils/timeline';
import { useStore } from '../store/store';
import { calculateProductStatus } from '../utils/product-status';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { deleteProduct, currentUser, setSelectedProduct, setViewMode } = useStore();
  const completedCount = product.activities.filter((a) => a.status === 'completed').length;
  const totalCount = product.activities.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Förhindra att kortet öppnas när man klickar på ta bort
    if (confirm(`Är du säker på att du vill ta bort "${product.name}"? Detta går inte att ångra.`)) {
      deleteProduct(product.id);
      // Om produkten var vald, gå tillbaka till dashboard
      if (setSelectedProduct && setViewMode) {
        setSelectedProduct(null);
        setViewMode('dashboard');
      }
    }
  };

  const statusColors = {
    draft: 'var(--color-text-tertiary)',
    active: 'var(--color-info)',
    completed: 'var(--color-success)',
    cancelled: 'var(--color-danger)',
  };

  const statusLabels = {
    draft: 'Utkast',
    active: 'Aktiv',
    completed: 'Klart',
    cancelled: 'Inställd',
  };

  return (
    <div className="product-card" onClick={onClick}>
      <div className="product-card-header">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-card-header-right">
          <div className="status-display">
            <span
              className="status-badge-auto"
              style={{
                backgroundColor: statusColors[product.status] + '20',
                color: statusColors[product.status],
                border: `1px solid ${statusColors[product.status]}`,
              }}
              title={`Status beräknas automatiskt baserat på aktiviteter: ${completedCount}/${totalCount} klara`}
            >
              {statusLabels[product.status]}
            </span>
            {currentUser?.role === 'admin' && (
              <select
                className="status-override"
                value={product.status === 'cancelled' ? 'cancelled' : ''}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.value === 'cancelled') {
                    useStore.getState().updateProduct(product.id, { 
                      status: 'cancelled' 
                    });
                  } else {
                    // Återställ till automatisk status
                    const currentProduct = useStore.getState().products.find(p => p.id === product.id);
                    if (currentProduct) {
                      const autoStatus = calculateProductStatus(currentProduct);
                      useStore.getState().updateProduct(product.id, { status: autoStatus });
                    }
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                title="Överstyr status (endast Inställd)"
              >
                <option value="">Auto</option>
                <option value="cancelled">Inställd</option>
              </select>
            )}
          </div>
          {currentUser?.role === 'admin' && (
            <button
              className="delete-button"
              onClick={handleDelete}
              title="Ta bort produkt"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="product-card-body">
        <div className="product-info">
          <div className="info-row">
            <span className="info-label">GTIN:</span>
            <span className="info-value">{product.gtin}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Typ:</span>
            <span className="info-value">
              {product.productType === 'delisting' ? 'Delisting (Validoo)' : 'Lansering'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">
              {product.productType === 'delisting' ? 'Delistingsvecka:' : 'Lanseringsvecka:'}
            </span>
            <span className="info-value">
              {formatWeekYear(product.launchYear, product.launchWeek)}
            </span>
          </div>
          {product.productType === 'launch' && product.retailers && product.retailers.length > 0 && (
            <div className="info-row">
              <span className="info-label">Kedjor:</span>
              <span className="info-value">
                {product.retailers.map(r => r.retailer).join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-text">
              {completedCount} / {totalCount} aktiviteter klara
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
    </div>
  );
};

