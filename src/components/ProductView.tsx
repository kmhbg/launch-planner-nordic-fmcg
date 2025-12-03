import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { formatWeekYear } from '../utils/timeline';
import { exportProductToPDF, exportActivityToICS } from '../utils/export';
import { calculateProductStatus } from '../utils/product-status';
import { TaskList } from './TaskList';
import { EditProductForm } from './EditProductForm';
import './ProductView.css';

export const ProductView: React.FC = () => {
  const {
    products,
    selectedProductId,
    setSelectedProduct,
    setViewMode,
    updateActivity,
    updateProduct,
    addComment,
    deleteProduct,
    currentUser,
    users,
  } = useStore();

  const product = products.find((p) => p.id === selectedProductId);

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Uppdatera produktstatus automatiskt när aktiviteter ändras
  useEffect(() => {
    if (product && product.status !== 'cancelled') {
      const autoStatus = calculateProductStatus(product);
      if (autoStatus !== product.status) {
        updateProduct(product.id, { status: autoStatus });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.activities, product?.id]);

  if (!product) {
    return (
      <div className="product-view-empty">
        <p>Ingen produkt vald</p>
        <button className="primary" onClick={() => setViewMode('dashboard')}>
          Tillbaka till dashboard
        </button>
      </div>
    );
  }

  const handleExportPDF = () => {
    exportProductToPDF(product);
  };

  const handleExportICS = (activityId: string) => {
    const activity = product.activities.find((a) => a.id === activityId);
    if (activity) {
      const icsContent = exportActivityToICS(activity, product);
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activity.name}-${product.name}.ics`;
      link.click();
    }
  };

  const handleStatusChange = (activityId: string, status: 'not_started' | 'in_progress' | 'completed') => {
    updateActivity(product.id, activityId, { status });
  };

  const handleAssigneeChange = (activityId: string, assigneeId: string) => {
    const assignee = users.find((u) => u.id === assigneeId);
    updateActivity(product.id, activityId, {
      assigneeId,
      assigneeName: assignee?.name,
    });
  };

  const handleAddComment = (activityId: string, text: string) => {
    if (!currentUser) return;
    addComment(product.id, activityId, {
      id: `comment-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      text,
      createdAt: new Date(),
    });
  };

  const completedCount = product.activities.filter((a) => a.status === 'completed').length;
  const totalCount = product.activities.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="product-view">
      <div className="product-view-header">
        <div>
          <button className="back-button" onClick={() => {
            setSelectedProduct(null);
            setViewMode('dashboard');
          }}>
            ← Tillbaka
          </button>
          <h2>{product.name}</h2>
          <div className="product-meta">
            <span>GTIN: {product.gtin}</span>
            <span>•</span>
            <span>
              {product.productType === 'delisting' ? 'Delisting' : 'Lansering'}: {formatWeekYear(product.launchYear, product.launchWeek)}
            </span>
            {product.productType === 'delisting' && (
              <>
                <span>•</span>
                <span className="badge info">Validoo-process</span>
              </>
            )}
            {product.productType === 'launch' && product.retailers && product.retailers.length > 0 && (
              <>
                <span>•</span>
                <span>
                  Kedjor: {product.retailers.map(r => r.retailer).join(', ')}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="product-actions">
          <button onClick={handleExportPDF}>Exportera PDF</button>
          {currentUser?.role === 'admin' && (
            <>
              <button className="secondary" onClick={() => setShowEditForm(true)}>
                Redigera produkt
              </button>
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`Är du säker på att du vill ta bort "${product.name}"? Detta går inte att ångra.`)) {
                    deleteProduct(product.id);
                    setSelectedProduct(null);
                    setViewMode('dashboard');
                  }
                }}
              >
                Ta bort produkt
              </button>
            </>
          )}
        </div>
      </div>

      {showEditForm && (
        <EditProductForm
          product={product}
          onClose={() => setShowEditForm(false)}
          onSave={() => setShowEditForm(false)}
        />
      )}

      {product.retailers && product.retailers.length > 0 && (
        <div className="retailers-info">
          <h3>Lanseringsveckor per kedja</h3>
          <div className="retailers-grid">
            {product.retailers.map((r, idx) => (
              <div key={idx} className="retailer-info-card">
                <strong>{r.retailer}</strong>
                <div className="retailer-weeks">
                  {r.launchWeeks.sort((a, b) => a - b).map((week, wIdx) => (
                    <span key={wIdx} className="week-badge">
                      V{week}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="product-progress">
        <div className="progress-info">
          <div>
            <span className="progress-label">Framsteg</span>
            <span className="progress-status" style={{ 
              color: product.status === 'completed' ? 'var(--color-success)' :
                     product.status === 'active' ? 'var(--color-info)' :
                     product.status === 'cancelled' ? 'var(--color-danger)' :
                     'var(--color-text-tertiary)',
              marginLeft: 'var(--spacing-sm)',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              ({product.status === 'completed' ? 'Klart' :
                product.status === 'active' ? 'Aktiv' :
                product.status === 'cancelled' ? 'Inställd' : 'Utkast'})
            </span>
          </div>
          <span className="progress-value">
            {completedCount} / {totalCount} aktiviteter klara ({Math.round(progress)}%)
          </span>
        </div>
        <div className="progress-bar-large">
          <div className="progress-fill-large" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-note" style={{ 
          fontSize: '0.75rem', 
          color: 'var(--color-text-secondary)',
          marginTop: 'var(--spacing-xs)',
        }}>
          {product.status === 'cancelled' 
            ? 'Status är manuellt inställd till "Inställd"'
            : 'Status uppdateras automatiskt baserat på aktiviteternas framsteg'}
        </div>
      </div>

      <div className="product-content">
        <div className="activities-section">
          <h3>Aktiviteter</h3>
          <TaskList
            activities={product.activities}
            users={users}
            selectedActivityId={selectedActivityId}
            onSelectActivity={setSelectedActivityId}
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            onExportICS={handleExportICS}
          />
        </div>
      </div>
    </div>
  );
};

