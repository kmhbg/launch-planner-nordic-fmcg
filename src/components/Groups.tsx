import React, { useState, useEffect } from 'react';
import './Groups.css';

interface Group {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  source: 'local' | 'azure' | 'ldap' | 'ad';
  externalId?: string;
  _count?: {
    members: number;
    groupRoles: number;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [groupRoles, setGroupRoles] = useState<Role[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDisplayName, setNewGroupDisplayName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
    loadUsers();
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMembers(selectedGroup.id);
      loadGroupRoles(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Fel vid laddning av grupper:', error);
    }
  };

  const loadUsers = async () => {
    try {
      // TODO: Skapa API-endpoint för att hämta alla användare
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Fel vid laddning av användare:', error);
    }
  };

  const loadRoles = async () => {
    try {
      // TODO: Skapa API-endpoint för att hämta alla roller
      const response = await fetch('/api/roles', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Fel vid laddning av roller:', error);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGroupMembers(data);
      }
    } catch (error) {
      console.error('Fel vid laddning av gruppmedlemmar:', error);
    }
  };

  const loadGroupRoles = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/roles`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGroupRoles(data);
      }
    } catch (error) {
      console.error('Fel vid laddning av grupproller:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Gruppnamn krävs');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newGroupName.trim(),
          displayName: newGroupDisplayName.trim() || newGroupName.trim(),
          description: newGroupDescription.trim() || null,
        }),
      });

      // Kontrollera om svaret är JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Server returnerade inte JSON:', text.substring(0, 200));
        alert('Servern svarade inte korrekt. Kontrollera att backend-servern körs och har startats om.');
        return;
      }

      if (response.ok) {
        await loadGroups();
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDisplayName('');
        setNewGroupDescription('');
      } else {
        const error = await response.json();
        console.error('Fel vid skapande av grupp:', error);
        alert(error.error || 'Kunde inte skapa grupp');
      }
    } catch (error: unknown) {
      console.error('Fel vid skapande av grupp:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('JSON')) {
        alert('Servern svarade inte korrekt. Kontrollera att backend-servern körs och har startats om.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
        alert(`Ett fel uppstod: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna grupp?')) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadGroups();
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte ta bort grupp');
      }
    } catch (error) {
      console.error('Fel vid borttagning av grupp:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        await loadGroupMembers(selectedGroup.id);
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte lägga till medlem');
      }
    } catch (error) {
      console.error('Fel vid tillägg av medlem:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadGroupMembers(selectedGroup.id);
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte ta bort medlem');
      }
    } catch (error) {
      console.error('Fel vid borttagning av medlem:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleAddRole = async (roleId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ roleId }),
      });

      if (response.ok) {
        await loadGroupRoles(selectedGroup.id);
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte lägga till roll');
      }
    } catch (error) {
      console.error('Fel vid tillägg av roll:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadGroupRoles(selectedGroup.id);
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte ta bort roll');
      }
    } catch (error) {
      console.error('Fel vid borttagning av roll:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleSyncGroups = async (source: string) => {
    setSyncing(source);
    try {
      const response = await fetch('/api/auth/sync-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ method: source }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Synkroniserade ${result.count} grupper från ${source}`);
        await loadGroups();
      } else {
        const error = await response.json();
        alert(error.error || 'Synkronisering misslyckades');
      }
    } catch (error) {
      console.error('Fel vid synkronisering:', error);
      alert('Ett fel uppstod');
    } finally {
      setSyncing(null);
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      local: 'Lokal',
      azure: 'Azure AD',
      ldap: 'LDAP',
      ad: 'Active Directory',
    };
    return labels[source] || source;
  };

  const availableUsers = users.filter(
    user => !groupMembers.some(member => member.id === user.id)
  );

  const availableRoles = roles.filter(
    role => !groupRoles.some(gr => gr.id === role.id)
  );

  return (
    <div className="groups-container">
      <div className="groups-header">
        <h2>Grupper</h2>
        <div className="groups-actions">
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Skapa lokal grupp
          </button>
          <div className="sync-buttons">
            <button
              className="btn-secondary"
              onClick={() => handleSyncGroups('azure')}
              disabled={syncing === 'azure'}
            >
              {syncing === 'azure' ? 'Synkar...' : 'Synka Azure AD'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleSyncGroups('ldap')}
              disabled={syncing === 'ldap'}
            >
              {syncing === 'ldap' ? 'Synkar...' : 'Synka LDAP'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleSyncGroups('ad')}
              disabled={syncing === 'ad'}
            >
              {syncing === 'ad' ? 'Synkar...' : 'Synka AD'}
            </button>
          </div>
        </div>
      </div>

      <div className="groups-content">
        <div className="groups-list">
          <h3>Alla grupper</h3>
          <div className="groups-grid">
            {groups.map(group => (
              <div
                key={group.id}
                className={`group-card ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                onClick={() => setSelectedGroup(group)}
              >
                <div className="group-card-header">
                  <h4>{group.displayName || group.name}</h4>
                  <span className={`source-badge source-${group.source}`}>
                    {getSourceLabel(group.source)}
                  </span>
                </div>
                <p className="group-description">{group.description || 'Ingen beskrivning'}</p>
                <div className="group-stats">
                  <span>{group._count?.members || 0} medlemmar</span>
                  <span>{group._count?.groupRoles || 0} roller</span>
                </div>
                {group.source === 'local' && (
                  <button
                    className="btn-danger btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                  >
                    Ta bort
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedGroup && (
          <div className="group-details">
            <h3>{selectedGroup.displayName || selectedGroup.name}</h3>
            <p className="group-source">Källa: {getSourceLabel(selectedGroup.source)}</p>

            <div className="group-section">
              <h4>Medlemmar ({groupMembers.length})</h4>
              <div className="members-list">
                {groupMembers.map(member => (
                  <div key={member.id} className="member-item">
                    <span>{member.name} ({member.email})</span>
                    <button
                      className="btn-danger btn-small"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      Ta bort
                    </button>
                  </div>
                ))}
                {availableUsers.length > 0 && (
                  <select
                    className="add-member-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddMember(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Lägg till medlem...</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="group-section">
              <h4>Roller ({groupRoles.length})</h4>
              <div className="roles-list">
                {groupRoles.map(role => (
                  <div key={role.id} className="role-item">
                    <span>{role.name}</span>
                    {role.description && <span className="role-description">{role.description}</span>}
                    <button
                      className="btn-danger btn-small"
                      onClick={() => handleRemoveRole(role.id)}
                    >
                      Ta bort
                    </button>
                  </div>
                ))}
                {availableRoles.length > 0 && (
                  <select
                    className="add-role-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddRole(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Lägg till roll...</option>
                    {availableRoles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Skapa ny lokal grupp</h3>
            <div className="form-group">
              <label>Gruppnamn *</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Gruppnamn"
              />
            </div>
            <div className="form-group">
              <label>Visningsnamn</label>
              <input
                type="text"
                value={newGroupDisplayName}
                onChange={(e) => setNewGroupDisplayName(e.target.value)}
                placeholder="Visningsnamn"
              />
            </div>
            <div className="form-group">
              <label>Beskrivning</label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Beskrivning"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Avbryt
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateGroup}
                disabled={loading}
              >
                {loading ? 'Skapar...' : 'Skapa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

