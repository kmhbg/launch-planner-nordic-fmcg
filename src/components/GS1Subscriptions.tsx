import React, { useState, useEffect } from 'react';
import './GS1Subscriptions.css';

interface Subscription {
  id: string;
  name?: string;
  description?: string;
  subscriberGln: string;
  eventType?: string;
  status?: string;
  createdAt?: string;
}

export const GS1Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [gs1Enabled, setGs1Enabled] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubscription, setNewSubscription] = useState({
    name: '',
    description: '',
    eventType: 'TradeItemChange',
    filterGtin: '',
    filterInformationProviderGln: '',
  });

  useEffect(() => {
    checkGS1Enabled().then(() => {
      if (gs1Enabled) {
        loadSubscriptions();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gs1Enabled) {
      loadSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs1Enabled]);

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

  const loadSubscriptions = async () => {
    if (!gs1Enabled) return;

    setLoading(true);
    try {
      const response = await fetch('/api/gs1/subscriptions', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Fel vid laddning av prenumerationer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!newSubscription.name.trim()) {
      alert('Namn krävs');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/gs1/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newSubscription.name.trim(),
          description: newSubscription.description.trim() || undefined,
          eventType: newSubscription.eventType,
          filterGtin: newSubscription.filterGtin.trim() || undefined,
          filterInformationProviderGln: newSubscription.filterInformationProviderGln.trim() || undefined,
        }),
      });

      if (response.ok) {
        await loadSubscriptions();
        setShowCreateModal(false);
        setNewSubscription({
          name: '',
          description: '',
          eventType: 'TradeItemChange',
          filterGtin: '',
          filterInformationProviderGln: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte skapa prenumeration');
      }
    } catch (error) {
      console.error('Fel vid skapande av prenumeration:', error);
      alert('Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna prenumeration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/gs1/subscriptions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadSubscriptions();
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte ta bort prenumeration');
      }
    } catch (error) {
      console.error('Fel vid borttagning av prenumeration:', error);
      alert('Ett fel uppstod');
    }
  };

  if (!gs1Enabled) {
    return (
      <div className="gs1-subscriptions-disabled">
        <h3>GS1 Prenumerationer</h3>
        <p>GS1-integration är inte aktiverad. Aktivera den i inställningarna för att hantera prenumerationer.</p>
      </div>
    );
  }

  return (
    <div className="gs1-subscriptions">
      <div className="gs1-subscriptions-header">
        <div>
          <h3>GS1 Prenumerationer</h3>
          <p className="section-description">
            Skapa prenumerationer för att få notifikationer om ändringar i GS1-produktdata. Detta säkerställer att du inte missar när attribut behöver uppdateras.
          </p>
        </div>
        <button className="primary" onClick={() => setShowCreateModal(true)}>
          + Ny prenumeration
        </button>
      </div>

      {loading && subscriptions.length === 0 ? (
        <div className="loading-state">
          <p>Laddar prenumerationer...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state">
          <p>Inga prenumerationer skapade ännu.</p>
        </div>
      ) : (
        <div className="subscriptions-list">
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="subscription-card">
              <div className="subscription-header">
                <h4>{subscription.name || 'Namnlös prenumeration'}</h4>
                {subscription.status && (
                  <span className={`subscription-status ${subscription.status.toLowerCase()}`}>
                    {subscription.status}
                  </span>
                )}
              </div>
              {subscription.description && (
                <p className="subscription-description">{subscription.description}</p>
              )}
              <div className="subscription-details">
                {subscription.eventType && (
                  <span>Typ: {subscription.eventType}</span>
                )}
                {subscription.createdAt && (
                  <span>Skapad: {new Date(subscription.createdAt).toLocaleDateString('sv-SE')}</span>
                )}
              </div>
              <div className="subscription-actions">
                <button
                  className="danger btn-small"
                  onClick={() => handleDeleteSubscription(subscription.id)}
                >
                  Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Skapa ny prenumeration</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Namn *</label>
                <input
                  type="text"
                  value={newSubscription.name}
                  onChange={(e) => setNewSubscription({ ...newSubscription, name: e.target.value })}
                  placeholder="t.ex. Produktändringar för vårt varumärke"
                />
              </div>
              <div className="form-group">
                <label>Beskrivning</label>
                <textarea
                  value={newSubscription.description}
                  onChange={(e) => setNewSubscription({ ...newSubscription, description: e.target.value })}
                  placeholder="Beskrivning av prenumerationen (valfritt)"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Händelsetyp</label>
                <select
                  value={newSubscription.eventType}
                  onChange={(e) => setNewSubscription({ ...newSubscription, eventType: e.target.value })}
                >
                  <option value="TradeItemChange">Produktändringar</option>
                  <option value="TradeItemCreated">Nya produkter</option>
                  <option value="TradeItemDeleted">Borttagna produkter</option>
                </select>
              </div>
              <div className="form-group">
                <label>Filtrera på GTIN (valfritt)</label>
                <input
                  type="text"
                  value={newSubscription.filterGtin}
                  onChange={(e) => setNewSubscription({ ...newSubscription, filterGtin: e.target.value })}
                  placeholder="Lämna tom för alla produkter"
                />
              </div>
              <div className="form-group">
                <label>Filtrera på Informationsleverantör GLN (valfritt)</label>
                <input
                  type="text"
                  value={newSubscription.filterInformationProviderGln}
                  onChange={(e) => setNewSubscription({ ...newSubscription, filterInformationProviderGln: e.target.value })}
                  placeholder="Lämna tom för alla leverantörer"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary" onClick={() => setShowCreateModal(false)}>
                Avbryt
              </button>
              <button className="primary" onClick={handleCreateSubscription} disabled={loading}>
                {loading ? 'Skapar...' : 'Skapa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

