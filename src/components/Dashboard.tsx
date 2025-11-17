import React, { useState } from 'react';
import { useStore } from '../store/store';
import { ProductCard } from './ProductCard';
import { ProductForm } from './ProductForm';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { products, setSelectedProduct, setViewMode } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'draft'>('all');

  const filteredProducts = products.filter((p) => {
    if (filter === 'all') return true;
    // Mappa 'completed' till 'completed' status
    if (filter === 'completed') return p.status === 'completed';
    // Mappa 'active' till 'active' status
    if (filter === 'active') return p.status === 'active';
    // Mappa 'draft' till 'draft' status
    if (filter === 'draft') return p.status === 'draft';
    return false;
  });

  const handleProductClick = (productId: string) => {
    setSelectedProduct(productId);
    setViewMode('product');
  };

  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    completed: products.filter((p) => p.status === 'completed').length,
    draft: products.filter((p) => p.status === 'draft').length,
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Produktlanseringar</h2>
          <p className="subtitle">Översikt över alla planerade lanseringar</p>
        </div>
        <button className="primary" onClick={() => setShowForm(true)}>
          + Ny produkt
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Totalt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Aktiva</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Klara</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.draft}</div>
          <div className="stat-label">Utkast</div>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Alla
        </button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Aktiva
        </button>
        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Klara
        </button>
        <button
          className={filter === 'draft' ? 'active' : ''}
          onClick={() => setFilter('draft')}
        >
          Utkast
        </button>
      </div>

      {showForm && (
        <ProductForm
          onClose={() => setShowForm(false)}
          onSave={() => setShowForm(false)}
        />
      )}

      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>Inga produkter hittades. Skapa din första produktlansering!</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => handleProductClick(product.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

