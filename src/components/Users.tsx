import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import './Users.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  authMethod: string;
  createdAt: string;
  assignedRoles?: string[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const { currentUser } = useStore();

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Säkerställ att alla användare har assignedRoles som en array
        const usersWithRoles = data.map((user: User) => ({
          ...user,
          assignedRoles: user.assignedRoles || [],
        }));
        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error('Fel vid laddning av användare:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
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

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!confirm(`Är du säker på att du vill ta bort användaren "${user.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte ta bort användare');
      }
    } catch (error) {
      console.error('Fel vid borttagning av användare:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      alert('Namn, e-post och lösenord krävs');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
          authMethod: 'local',
        }),
      });

      if (response.ok) {
        await loadUsers();
        setShowCreateModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('user');
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte skapa användare');
      }
    } catch (error) {
      console.error('Fel vid skapande av användare:', error);
      alert('Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ roleId }),
      });

      if (response.ok) {
        await loadUsers();
        // Uppdatera selectedUser om den är vald
        if (selectedUser?.id === userId) {
          const updatedUsersResponse = await fetch('/api/users', {
            credentials: 'include',
          });
          if (updatedUsersResponse.ok) {
            const updatedUsers = await updatedUsersResponse.json();
            const updatedUser = updatedUsers.find((u: User) => u.id === userId);
            if (updatedUser) {
              setSelectedUser({ ...updatedUser, assignedRoles: updatedUser.assignedRoles || [] });
            }
          }
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte tilldela roll');
      }
    } catch (error) {
      console.error('Fel vid tilldelning av roll:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadUsers();
        // Uppdatera selectedUser om den är vald
        if (selectedUser?.id === userId) {
          const updatedUsersResponse = await fetch('/api/users', {
            credentials: 'include',
          });
          if (updatedUsersResponse.ok) {
            const updatedUsers = await updatedUsersResponse.json();
            const updatedUser = updatedUsers.find((u: User) => u.id === userId);
            if (updatedUser) {
              setSelectedUser({ ...updatedUser, assignedRoles: updatedUser.assignedRoles || [] });
            }
          }
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte ta bort roll');
      }
    } catch (error) {
      console.error('Fel vid borttagning av roll:', error);
      alert('Ett fel uppstod');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="users-container">
        <div className="loading-state">
          <p>Laddar användare...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <div>
          <h3>Användare</h3>
          <p className="section-description">
            Hantera användare och tilldela roller. Användare kan skapas lokalt eller hämtas från SSO-system (Azure AD, LDAP, AD).
          </p>
        </div>
        <button className="primary" onClick={() => setShowCreateModal(true)}>
          + Ny användare
        </button>
      </div>

      <div className="users-content">
        <div className="users-list-section">
          <h4>Användare</h4>
          {users.length === 0 ? (
            <div className="empty-state">
              <p>Inga användare hittades.</p>
            </div>
          ) : (
            <div className="users-list">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`user-card ${selectedUser?.id === user.id ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="user-card-header">
                    <div>
                      <strong>{user.name}</strong>
                      <div className="user-card-badges">
                        {user.role === 'admin' && (
                          <span className="badge info">Admin</span>
                        )}
                        {user.authMethod !== 'local' && (
                          <span className="badge secondary">{user.authMethod.toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="user-email">{user.email}</span>
                  <div className="user-card-stats">
                    {user.assignedRoles && user.assignedRoles.length > 0 && (
                      <span>{user.assignedRoles.length} {user.assignedRoles.length === 1 ? 'roll' : 'roller'}</span>
                    )}
                    {user.authMethod === 'local' && (
                      <span>Lokal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="user-details-section">
            <div className="user-details-header">
              <div>
                <h4>{selectedUser.name}</h4>
                <span className="user-email">{selectedUser.email}</span>
                <div className="user-details-meta">
                  <span>Inloggningsmetod: {selectedUser.authMethod === 'local' ? 'Lokal' : selectedUser.authMethod.toUpperCase()}</span>
                  {selectedUser.role === 'admin' && <span>Administratör</span>}
                </div>
              </div>
              {selectedUser.id !== currentUser?.id && selectedUser.authMethod === 'local' && (
                <button
                  className="danger btn-small"
                  onClick={() => handleDeleteUser(selectedUser.id)}
                >
                  Ta bort
                </button>
              )}
              {selectedUser.id === currentUser?.id && (
                <span className="user-current-badge">Du</span>
              )}
            </div>

            <div className="user-roles-section">
              <h5>Roller ({selectedUser.assignedRoles?.length || 0})</h5>
              <div className="user-roles-list">
                {selectedUser.assignedRoles && selectedUser.assignedRoles.length > 0 ? (
                  selectedUser.assignedRoles.map((roleId) => {
                    const role = roles.find(r => r.id === roleId);
                    return role ? (
                      <div key={roleId} className="user-role-item">
                        <div>
                          <span className="role-name">{role.name}</span>
                          {role.description && (
                            <span className="role-description">{role.description}</span>
                          )}
                        </div>
                        <button
                          className="btn-danger btn-small"
                          onClick={() => handleRemoveRole(selectedUser.id, roleId)}
                        >
                          Ta bort
                        </button>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="no-roles">Inga roller tilldelade</p>
                )}
                {roles.filter(r => !(selectedUser.assignedRoles || []).includes(r.id)).length > 0 && (
                  <select
                    className="add-role-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignRole(selectedUser.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Lägg till roll...</option>
                    {roles
                      .filter(r => !(selectedUser.assignedRoles || []).includes(r.id))
                      .map(role => (
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
            <div className="modal-header">
              <h3>Skapa ny användare</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Namn *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Användarens namn"
                />
              </div>
              <div className="form-group">
                <label>E-post *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="användare@example.com"
                />
              </div>
              <div className="form-group">
                <label>Lösenord *</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Minst 8 tecken"
                />
              </div>
              <div className="form-group">
                <label>Roll</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                >
                  <option value="user">Användare</option>
                  <option value="admin">Administratör</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary" onClick={() => setShowCreateModal(false)}>
                Avbryt
              </button>
              <button className="primary" onClick={handleCreateUser} disabled={loading}>
                {loading ? 'Skapar...' : 'Skapa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

