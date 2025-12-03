import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import './RolesAndGroups.css';

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

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export const RolesAndGroups: React.FC = () => {
  const { roles, addRole, updateRole, deleteRole } = useStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [groupRoles, setGroupRoles] = useState<Role[]>([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDisplayName, setNewGroupDisplayName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'roles' | 'groups'>('roles');

  useEffect(() => {
    loadGroups();
    loadUsers();
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

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Server returnerade inte JSON:', text.substring(0, 200));
        alert('Servern svarade inte korrekt. Kontrollera att backend-servern körs och har startats om.');
        return;
      }

      if (response.ok) {
        await loadGroups();
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setNewGroupDisplayName('');
        setNewGroupDescription('');
      } else {
        const error = await response.json();
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

  const handleAddRoleToGroup = async (roleId: string) => {
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

  const handleRemoveRoleFromGroup = async (roleId: string) => {
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

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      alert('Rollnamn krävs');
      return;
    }
    addRole({ name: newRoleName.trim(), description: newRoleDescription.trim() || undefined });
    setShowCreateRoleModal(false);
    setNewRoleName('');
    setNewRoleDescription('');
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
        await loadGroups();
        alert('Grupper synkroniserade');
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

  const availableUsers = selectedGroup
    ? users.filter(u => !groupMembers.some(m => m.id === u.id))
    : [];
  const availableRoles = selectedGroup
    ? roles.filter(r => !groupRoles.some(gr => gr.id === r.id))
    : [];

  return (
    <div className="roles-and-groups">
      <div className="roles-and-groups-header">
        <h3>Roller & Grupper</h3>
        <p className="section-description">
          Hantera roller och grupper. Tilldela roller till grupper för att ge medlemmar automatiskt behörigheter.
        </p>
      </div>

      <div className="view-tabs">
        <button
          className={activeView === 'roles' ? 'active' : ''}
          onClick={() => setActiveView('roles')}
        >
          Roller
        </button>
        <button
          className={activeView === 'groups' ? 'active' : ''}
          onClick={() => setActiveView('groups')}
        >
          Grupper
        </button>
      </div>

      {activeView === 'roles' && (
        <div className="roles-section">
          <div className="section-header">
            <div>
              <h4>Roller</h4>
              <p className="section-description">
                Skapa och hantera roller som kan tilldelas till användare och grupper.
              </p>
            </div>
            <button className="primary" onClick={() => setShowCreateRoleModal(true)}>
              + Ny roll
            </button>
          </div>

          {roles.length === 0 ? (
            <div className="empty-state">
              <p>Inga roller skapade ännu. Skapa din första roll!</p>
            </div>
          ) : (
            <div className="roles-list">
              {roles.map((role) => (
                <div key={role.id} className="role-item">
                  <div className="role-info">
                    <strong>{role.name}</strong>
                    {role.description && <p className="role-description">{role.description}</p>}
                  </div>
                  <div className="role-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        const name = prompt('Nytt namn:', role.name);
                        if (name) {
                          const desc = prompt('Beskrivning:', role.description || '');
                          updateRole(role.id, { name, description: desc || undefined });
                        }
                      }}
                    >
                      Redigera
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        if (confirm(`Ta bort roll "${role.name}"? Detta kommer också ta bort rollen från alla användare och grupper.`)) {
                          deleteRole(role.id);
                        }
                      }}
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'groups' && (
        <div className="groups-section">
          <div className="section-header">
            <div>
              <h4>Grupper</h4>
              <p className="section-description">
                Hantera grupper och tilldela roller till dem. Medlemmar i grupper får automatiskt gruppens roller.
              </p>
            </div>
            <div className="header-actions">
              <button
                className="secondary"
                onClick={() => handleSyncGroups('azure')}
                disabled={syncing === 'azure'}
              >
                {syncing === 'azure' ? 'Synkar...' : 'Synka från Azure AD'}
              </button>
              <button
                className="secondary"
                onClick={() => handleSyncGroups('ldap')}
                disabled={syncing === 'ldap'}
              >
                {syncing === 'ldap' ? 'Synkar...' : 'Synka från LDAP'}
              </button>
              <button
                className="secondary"
                onClick={() => handleSyncGroups('ad')}
                disabled={syncing === 'ad'}
              >
                {syncing === 'ad' ? 'Synkar...' : 'Synka från AD'}
              </button>
              <button className="primary" onClick={() => setShowCreateGroupModal(true)}>
                + Ny lokal grupp
              </button>
            </div>
          </div>

          <div className="groups-content">
            <div className="groups-list-section">
              <h5>Grupper</h5>
              {groups.length === 0 ? (
                <div className="empty-state">
                  <p>Inga grupper hittades.</p>
                </div>
              ) : (
                <div className="groups-list">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className={`group-card ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                      onClick={() => setSelectedGroup(group)}
                    >
                      <div className="group-card-header">
                        <h6>{group.displayName || group.name}</h6>
                        <span className={`group-source-badge ${group.source}`}>
                          {group.source === 'local' ? 'Lokal' : group.source.toUpperCase()}
                        </span>
                      </div>
                      {group.description && (
                        <p className="group-card-description">{group.description}</p>
                      )}
                      <div className="group-card-stats">
                        <span>{group._count?.members || 0} medlemmar</span>
                        <span>{group._count?.groupRoles || 0} roller</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedGroup && (
              <div className="group-details-section">
                <div className="group-details-header">
                  <div>
                    <h5>{selectedGroup.displayName || selectedGroup.name}</h5>
                    {selectedGroup.description && (
                      <p className="group-description">{selectedGroup.description}</p>
                    )}
                  </div>
                  {selectedGroup.source === 'local' && (
                    <button
                      className="danger btn-small"
                      onClick={() => handleDeleteGroup(selectedGroup.id)}
                    >
                      Ta bort grupp
                    </button>
                  )}
                </div>

                <div className="group-sections">
                  <div className="group-section">
                    <h6>Medlemmar ({groupMembers.length})</h6>
                    <div className="members-list">
                      {groupMembers.map((member) => (
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
                          {availableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="group-section">
                    <h6>Roller ({groupRoles.length})</h6>
                    <div className="roles-list">
                      {groupRoles.map((role) => (
                        <div key={role.id} className="role-item">
                          <span>{role.name}</span>
                          {role.description && <span className="role-description">{role.description}</span>}
                          <button
                            className="btn-danger btn-small"
                            onClick={() => handleRemoveRoleFromGroup(role.id)}
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
                              handleAddRoleToGroup(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Lägg till roll...</option>
                          {availableRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateRoleModal && (
        <div className="modal-overlay" onClick={() => setShowCreateRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Skapa ny roll</h3>
              <button className="modal-close" onClick={() => setShowCreateRoleModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Namn *</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Rollnamn"
                />
              </div>
              <div className="form-group">
                <label>Beskrivning</label>
                <input
                  type="text"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Beskrivning (valfritt)"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary" onClick={() => setShowCreateRoleModal(false)}>
                Avbryt
              </button>
              <button className="primary" onClick={handleCreateRole}>
                Skapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="modal-overlay" onClick={() => setShowCreateGroupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Skapa ny lokal grupp</h3>
              <button className="modal-close" onClick={() => setShowCreateGroupModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Namn *</label>
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
                  placeholder="Visningsnamn (valfritt)"
                />
              </div>
              <div className="form-group">
                <label>Beskrivning</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Beskrivning (valfritt)"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary" onClick={() => setShowCreateGroupModal(false)}>
                Avbryt
              </button>
              <button className="primary" onClick={handleCreateGroup} disabled={loading}>
                {loading ? 'Skapar...' : 'Skapa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

